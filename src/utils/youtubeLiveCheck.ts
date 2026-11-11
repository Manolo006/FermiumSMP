export interface YouTubeLiveCheckResult {
  isLive: boolean;
  videoId?: string;
  title?: string;
}

interface YtVideoData {
  video_id?: string;
  title?: string;
  isPlayable?: boolean;
  errorCode?: string | null;
}

interface YtPlayerInstance {
  getVideoData?: () => YtVideoData;
  destroy?: () => void;
}

interface YtWindow extends Window {
  YT?: {
    Player: new (
      elementId: string,
      options: {
        events?: {
          onReady?: (ev: { target: YtPlayerInstance }) => void;
          onError?: () => void;
        };
      }
    ) => YtPlayerInstance;
  };
  onYouTubeIframeAPIReady?: () => void;
}

let apiLoadPromise: Promise<boolean> | null = null;

function ensureYouTubeIframeApi(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const win = window as YtWindow;
  if (win.YT?.Player) return Promise.resolve(true);
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<boolean>((resolve) => {
    const existingCb = win.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      resolve(Boolean(win.YT?.Player));
    }, 6000);

    win.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      if (typeof existingCb === 'function') existingCb();
      resolve(true);
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        resolve(false);
      };
      document.head.appendChild(script);
    }
  });

  return apiLoadPromise;
}

/**
 * Check real-time live status for multiple YouTube channels (by UC... channelId)
 * directly through the official YouTube IFrame Player API with zero proxy/CORS issues.
 */
export async function checkYouTubeChannelsLive(
  channelIds: string[]
): Promise<Record<string, YouTubeLiveCheckResult>> {
  const uniqueIds = Array.from(new Set(channelIds.filter(Boolean)));
  const output: Record<string, YouTubeLiveCheckResult> = {};
  for (const id of uniqueIds) {
    output[id] = { isLive: false };
  }
  if (uniqueIds.length === 0) return output;

  const ready = await ensureYouTubeIframeApi();
  const win = window as YtWindow;
  if (!ready || !win.YT?.Player) return output;

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0;pointer-events:none;overflow:hidden;';
  document.body.appendChild(container);

  const players: YtPlayerInstance[] = [];
  const originParam =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';

  await Promise.all(
    uniqueIds.map(
      (channelId, idx) =>
        new Promise<void>((resolve) => {
          let settled = false;
          const finish = (res: YouTubeLiveCheckResult) => {
            if (settled) return;
            settled = true;
            output[channelId] = res;
            resolve();
          };

          const timer = window.setTimeout(() => {
            finish({ isLive: false });
          }, 5500);

          const frameId = `fermium_yt_probe_${Date.now()}_${idx}`;
          const iframe = document.createElement('iframe');
          iframe.id = frameId;
          iframe.width = '10';
          iframe.height = '10';
          iframe.src = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(
            channelId
          )}&enablejsapi=1&mute=1&autoplay=0${originParam}`;
          container.appendChild(iframe);

          try {
            const player = new win.YT!.Player(frameId, {
              events: {
                onReady: (ev) => {
                  window.clearTimeout(timer);
                  const data = ev.target.getVideoData?.();
                  const isTrulyLive = Boolean(
                    data &&
                      data.isPlayable === true &&
                      !data.errorCode &&
                      data.video_id &&
                      data.video_id !== 'live_stream'
                  );
                  finish(
                    isTrulyLive
                      ? {
                          isLive: true,
                          videoId: data!.video_id,
                          title: data!.title || '',
                        }
                      : { isLive: false }
                  );
                },
                onError: () => {
                  window.clearTimeout(timer);
                  finish({ isLive: false });
                },
              },
            });
            players.push(player);
          } catch {
            window.clearTimeout(timer);
            finish({ isLive: false });
          }
        })
    )
  );

  for (const p of players) {
    try {
      p.destroy?.();
    } catch {
      // Ignore cleanup errors
    }
  }
  container.remove();

  return output;
}
