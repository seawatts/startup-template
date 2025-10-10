import { sendToBackground } from '@plasmohq/messaging';
import { Button } from '@seawatts/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@seawatts/ui/dropdown-menu';
import { Icons } from '@seawatts/ui/icons';

import { useChromePortal } from '~/hooks/use-chrome-portal';

// Updated component for action buttons using dropdown menu
export function Menu() {
  const portalElement = useChromePortal();

  const openTab = (url: string) => {
    sendToBackground({
      body: { url },
      name: 'openTab',
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline">
          <Icons.Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent portalContainer={portalElement}>
        <DropdownMenuItem onClick={() => openTab('./tabs/welcome.html')}>
          <Icons.Bookmark className="mr-2 h-4 w-4" />
          Tutorial
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openTab('./tabs/changelog.html')}>
          <Icons.Bell className="mr-2 h-4 w-4" />
          Changelog
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openTab('./tabs/account.html')}>
          <Icons.User className="mr-2 h-4 w-4" />
          Account
        </DropdownMenuItem>
        {/* <DropdownMenuItem
          onClick={() =>
            window.open(
              "https://apply.ycombinator.com/app/edit",
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <Icons.Plus className="mr-2 h-4 w-4" />
          Invite Acme
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
