import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@acme/ui/alert-dialog';
import { Button } from '@acme/ui/button';
import { CopyButton } from '@acme/ui/copy-button';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { Entitled } from '../entitlement/entitled';
import { NotEntitled } from '../entitlement/not-entitled';
import { ScriptForm } from './form';
import type { GenerateYCVideoScriptResponse } from './script-display';

interface ScriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function convertScriptToMarkdown(
  script?: GenerateYCVideoScriptResponse,
): string {
  let markdown = '# YC Founder Video Script\n\n';
  const totalSpeakingTime = script?.lines?.reduce(
    (total, line) => total + (line.speakingTimeSeconds ?? 0),
    0,
  );
  markdown += `Speaking Time: ${totalSpeakingTime?.toFixed(0) ?? 'N/A'}s\n\n`;

  markdown += '## Script\n\n';
  if (script?.lines)
    for (const line of script.lines) {
      markdown += `**${line.speaker}** (${line.speakingTimeSeconds?.toFixed(0) ?? 'N/A'}s): ${line.line}\n\n`;
    }

  markdown += '## Bullet Points\n\n';
  if (script?.bulletPoints)
    for (const point of script.bulletPoints) {
      markdown += `- ${point.line}\n`;
    }

  return markdown;
}

export function ScriptDialog({ isOpen, onClose }: ScriptDialogProps) {
  const portalElement = useChromePortal();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent portalContainer={portalElement}>
        <AlertDialogHeader>
          <AlertDialogTitle>Founder Video Script</AlertDialogTitle>
          <AlertDialogDescription className="flex flex-col gap-4">
            <p>
              Remember, this is just a starting point. Follow the official
              guidelines at{' '}
              <a
                href="https://www.ycombinator.com/video"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                YC's video instructions
              </a>
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              <li>Keep it to 1 minute</li>
              <li>Include all founders</li>
              <li>Practice with script, record with bullet points</li>
              <li>Speak naturally as if talking to a friend</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScriptForm>
          {({ isPending, data }) => {
            const markdownScript = convertScriptToMarkdown(data);

            return (
              <AlertDialogFooter className="flex w-full sm:justify-between">
                <Entitled entitlement="video_script">
                  <CopyButton
                    text={markdownScript}
                    className="flex items-center gap-2"
                    size="default"
                    variant={'outline'}
                    disabled={isPending}
                  >
                    Copy as Markdown
                  </CopyButton>
                </Entitled>
                <NotEntitled entitlement="video_script">
                  <div />
                </NotEntitled>
                <div className="self flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={onClose} type="button">
                    Close
                  </Button>
                  <Entitled entitlement="video_script">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Generating...' : 'Generate Script'}
                    </Button>
                  </Entitled>
                </div>
              </AlertDialogFooter>
            );
          }}
        </ScriptForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
