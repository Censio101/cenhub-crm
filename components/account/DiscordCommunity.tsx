import { ExternalLinkIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DISCORD_INVITE_URL,
  DISCORD_WIDGET_URL,
} from "@/lib/discord"

const CHANNEL_MESSAGES = [
  {
    author: "Censio Support",
    time: "I dag 09:14",
    text: "Velkommen til Censios community. Her hjælper vi med CRM, leads og onboarding.",
  },
  {
    author: "Censio Support",
    time: "I dag 09:16",
    text: "Log ind på Discord for at skrive i kanalen #support og få svar fra teamet.",
  },
]

export function DiscordCommunity() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="dashboard-card">
        <CardHeader className="border-b">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Discord
          </p>
          <CardTitle className="mt-1 text-lg">#support</CardTitle>
          <CardDescription>
            Censios support- og communitykanal for håndværkere. Stil spørgsmål
            om leads, kunder og jeres CRM — teamet svarer her.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-hidden rounded-[15px] bg-[#f2f3f5] ring-1 ring-foreground/10">
            <div className="flex items-center justify-between bg-[#e3e5e8] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#060607]">#support</p>
                <p className="text-xs text-[#4e5058]">
                  Censio support · community
                </p>
              </div>
              <span className="rounded-full bg-[#23a559]/15 px-2 py-0.5 text-xs font-medium text-[#23a559]">
                Online
              </span>
            </div>
            <ul className="space-y-4 px-4 py-5">
              {CHANNEL_MESSAGES.map((message) => (
                <li key={message.time + message.text} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                  >
                    C
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-[#060607]">
                        {message.author}
                      </span>{" "}
                      <span className="text-xs text-[#4e5058]">
                        {message.time}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[#2e3338]">
                      {message.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Log ind på Discord</CardTitle>
          <CardDescription>
            Åbn Censios Discord-fællesskab for at skrive med support og andre
            håndværkere. Skift invite-linket i{" "}
            <code className="text-xs">lib/discord.ts</code> når I har en rigtig
            server.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-10 bg-[#5865F2] hover:bg-[#4752C4]"
            )}
          >
            Log ind på Discord
            <ExternalLinkIcon />
          </a>

          {DISCORD_WIDGET_URL ? (
            <iframe
              title="Censio Discord"
              src={DISCORD_WIDGET_URL}
              className="h-[22rem] w-full rounded-[15px] bg-white"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Det officielle Discord-widget vises her, når{" "}
              <code className="text-xs">DISCORD_WIDGET_SERVER_ID</code> er
              sat.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
