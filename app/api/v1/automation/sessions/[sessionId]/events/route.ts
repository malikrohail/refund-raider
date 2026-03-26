import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import {
  getAutomationSessionStateForUser,
  listAutomationEventsForUser
} from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

function encodeSseFrame(options: { event?: string; data?: unknown; id?: string }) {
  const lines: string[] = [];

  if (options.id) {
    lines.push(`id: ${options.id}`);
  }

  if (options.event) {
    lines.push(`event: ${options.event}`);
  }

  if (options.data !== undefined) {
    const json = JSON.stringify(options.data);
    for (const line of json.split("\n")) {
      lines.push(`data: ${line}`);
    }
  }

  return `${lines.join("\n")}\n\n`;
}

function createEventStream(request: Request, encoder: TextEncoder, sessionId: string, userId: string) {
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  const deliveredIds = new Set<string>();
  const since = new URL(request.url).searchParams.get("since");

  return new ReadableStream({
    async start(controller) {
      const send = (frame: string) => {
        controller.enqueue(encoder.encode(frame));
      };

      const pushEvent = (event: Awaited<ReturnType<typeof listAutomationEventsForUser>>[number]) => {
        if (deliveredIds.has(event.id)) {
          return;
        }

        deliveredIds.add(event.id);
        send(encodeSseFrame({ event: "automation-event", id: event.id, data: event }));
      };

      try {
        const workspace = await getAutomationSessionStateForUser(userId, sessionId);

        send(
          encodeSseFrame({
            event: "snapshot",
            data: {
              automationSession: workspace.automationSession,
              browserSnapshots: workspace.browserSnapshots,
              browserCommands: workspace.browserCommands,
              automationEvents: workspace.automationEvents.filter((event) =>
                since ? event.createdAt >= since : true
              )
            }
          })
        );

        for (const event of workspace.automationEvents) {
          if (since && event.createdAt < since) {
            continue;
          }

          deliveredIds.add(event.id);
        }

        pollTimer = setInterval(async () => {
          if (closed) {
            return;
          }

          try {
            const events = await listAutomationEventsForUser(userId, sessionId);
            for (const event of events) {
              if (since && event.createdAt < since) {
                continue;
              }

              pushEvent(event);
            }
          } catch (error) {
            send(
              encodeSseFrame({
                event: "error",
                data: {
                  message: error instanceof Error ? error.message : "Failed to read automation events."
                }
              })
            );
            controller.close();
            closed = true;
          }
        }, 1000);

        heartbeatTimer = setInterval(() => {
          if (!closed) {
            send(": keepalive\n\n");
          }
        }, 15000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          if (pollTimer) {
            clearInterval(pollTimer);
          }
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
          }
          try {
            controller.close();
          } catch {
            // ignore stream close errors on abort
          }
        });
      } catch (error) {
        send(
          encodeSseFrame({
            event: "error",
            data: {
              message: error instanceof Error ? error.message : "Failed to initialize automation event stream."
            }
          })
        );
        controller.close();
        closed = true;
      }
    },
    cancel() {
      closed = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    }
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const encoder = new TextEncoder();
    const stream = createEventStream(request, encoder, params.sessionId, user.id);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
