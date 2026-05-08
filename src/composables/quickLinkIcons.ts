interface KnownBrandRule {
  hosts: string[];
  iconClass: string;
}

const knownBrandRules: KnownBrandRule[] = [
  { hosts: ["github.com"], iconClass: "icon-[logos--github-icon]" },
  { hosts: ["gitlab.com"], iconClass: "icon-[logos--gitlab]" },
  { hosts: ["youtube.com", "youtu.be"], iconClass: "icon-[logos--youtube-icon]" },
  { hosts: ["mail.google.com", "gmail.com"], iconClass: "icon-[logos--google-gmail]" },
  {
    hosts: ["google.com", "docs.google.com", "drive.google.com", "calendar.google.com"],
    iconClass: "icon-[logos--google-icon]",
  },
  { hosts: ["x.com", "twitter.com"], iconClass: "icon-[logos--twitter]" },
  { hosts: ["reddit.com"], iconClass: "icon-[logos--reddit-icon]" },
  { hosts: ["discord.com"], iconClass: "icon-[logos--discord-icon]" },
  { hosts: ["slack.com"], iconClass: "icon-[logos--slack-icon]" },
  { hosts: ["figma.com"], iconClass: "icon-[logos--figma]" },
  { hosts: ["notion.so", "notion.site"], iconClass: "icon-[logos--notion-icon]" },
  { hosts: ["vercel.com"], iconClass: "icon-[logos--vercel-icon]" },
  { hosts: ["linkedin.com"], iconClass: "icon-[logos--linkedin-icon]" },
  { hosts: ["facebook.com", "messenger.com"], iconClass: "icon-[logos--facebook]" },
  { hosts: ["instagram.com"], iconClass: "icon-[logos--instagram-icon]" },
  { hosts: ["whatsapp.com", "web.whatsapp.com"], iconClass: "icon-[logos--whatsapp-icon]" },
  { hosts: ["telegram.org", "web.telegram.org", "t.me"], iconClass: "icon-[logos--telegram]" },
  {
    hosts: ["outlook.live.com", "outlook.com", "office.com", "microsoft.com"],
    iconClass: "icon-[logos--microsoft-icon]",
  },
  { hosts: ["netflix.com"], iconClass: "icon-[logos--netflix-icon]" },
  { hosts: ["spotify.com", "open.spotify.com"], iconClass: "icon-[logos--spotify-icon]" },
  { hosts: ["cloudflare.com", "dash.cloudflare.com"], iconClass: "icon-[logos--cloudflare-icon]" },
];

function normalizeHostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
}

function isMatchingHost(hostname: string, candidate: string): boolean {
  return hostname === candidate || hostname.endsWith(`.${candidate}`);
}

export function getKnownQuickLinkIcon(url: string): string {
  try {
    const hostname = normalizeHostname(url);
    const match = knownBrandRules.find((rule) =>
      rule.hosts.some((candidate) => isMatchingHost(hostname, candidate)),
    );

    return match?.iconClass ?? "";
  } catch {
    return "";
  }
}
