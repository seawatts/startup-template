import { Button } from '@acme/ui/button';
import { ExpandingTextarea } from '@acme/ui/expanding-textarea';
import { Icons } from '@acme/ui/icons';

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onMicrophoneClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onSubmit: () => void;
  isPlayingPrompt: boolean;
  isPending: boolean;
}

export function AnswerInput({
  value,
  onChange,
  onMicrophoneClick,
  onSubmit,
  isPlayingPrompt,
  isPending,
}: AnswerInputProps) {
  return (
    <div className="relative flex items-center">
      <ExpandingTextarea
        className="py-3 pl-2 pr-12"
        disabled={isPlayingPrompt}
        id="answer"
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isPlayingPrompt
            ? 'Playing prompt...'
            : 'Type or speak (recommended) your answer...'
        }
        rows={1}
        value={value}
      />
      {value ? (
        <Button
          className="absolute bottom-[5px] right-2 transform"
          disabled={isPending}
          onClick={onSubmit}
          size="sm"
          type="button"
        >
          {isPending ? <Icons.Spinner /> : <Icons.SendHorizontal />}
        </Button>
      ) : (
        <Button
          className="absolute bottom-[5px] right-2 transform cursor-pointer text-muted-foreground hover:text-secondary-foreground"
          disabled={isPlayingPrompt}
          onClick={onMicrophoneClick}
          size="sm"
          type="button"
          variant="ghost"
        >
          {isPlayingPrompt ? (
            <Icons.AudioLines className="animate-pulse text-primary" />
          ) : (
            <Icons.Mic />
          )}
        </Button>
      )}
    </div>
  );
}
