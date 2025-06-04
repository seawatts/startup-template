import { Icons } from '@acme/ui/customicons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@acme/ui/tabs';

export interface ScriptLine {
  speaker?: string;
  line?: string;
  speakingTimeSeconds?: number;
}

export interface GenerateYCVideoScriptResponse {
  lines?: ScriptLine[];
  bulletPoints?: ScriptLine[];
}

export interface ScriptDisplayProps {
  script?: GenerateYCVideoScriptResponse | null;
  isPending?: boolean;
}

function ScriptLines({ lines }: { lines: ScriptLine[] }) {
  return (
    <div className="flex flex-col gap-4">
      {lines.map((line) => (
        <div
          key={line.line}
          className="flex flex-col gap-2 rounded-md border p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {line.speaker} ({line.speakingTimeSeconds?.toFixed(0) ?? 'N/A'}s)
            </p>
          </div>
          <p>{line.line}</p>
        </div>
      ))}
    </div>
  );
}

function BulletPoints({ bulletPoints }: { bulletPoints: ScriptLine[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {bulletPoints.map((point) => (
        <li className="rounded-md border p-4" key={point.line}>
          {point.line}
        </li>
      ))}
    </ul>
  );
}

export function ScriptDisplay({ script, isPending }: ScriptDisplayProps) {
  const totalTime = script?.lines?.reduce(
    (accumulator, line) => accumulator + (line.speakingTimeSeconds ?? 0),
    0,
  );
  return (
    <div className="z-50 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Speaking Time: {totalTime?.toFixed(0) ?? 'N/A'}s
        </p>
      </div>
      <Tabs defaultValue="script" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="script" className="flex items-center gap-2">
            {isPending && (script?.bulletPoints?.length ?? 0) === 0 && (
              <Icons.Spinner />
            )}
            Script
          </TabsTrigger>
          <TabsTrigger value="bulletPoints" className="flex items-center gap-2">
            {isPending && (script?.bulletPoints?.length ?? 0) > 0 && (
              <Icons.Spinner />
            )}
            Bullet Points
          </TabsTrigger>
        </TabsList>
        <TabsContent value="script">
          <div className="max-h-[400px] overflow-y-scroll">
            {isPending && script?.lines?.length === 0 ? (
              <div className="flex items-center gap-2">
                <Icons.Spinner />
                Generating script...
              </div>
            ) : (
              <ScriptLines lines={script?.lines ?? []} />
            )}
          </div>
        </TabsContent>
        <TabsContent value="bulletPoints">
          <div className="max-h-[400px] overflow-y-scroll">
            {' '}
            {isPending && script?.bulletPoints?.length === 0 ? (
              <div className="flex items-center gap-2">
                <Icons.Spinner />
                Waiting for script to generate...
              </div>
            ) : (
              <BulletPoints bulletPoints={script?.bulletPoints ?? []} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
