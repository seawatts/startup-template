import {
  Code,
  CreditCard,
  FolderPlus,
  KeyRound,
  Logs,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

export interface SidebarSection {
  label?: string;
  items: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    url: string;
  }[];
}

// Example usage with default sections
export const defaultSections = {
  monitoring: {
    items: [
      {
        icon: Logs,
        title: 'Function Calls',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/${projectId}/${envName}/function-calls',
      },
    ],
    label: 'Monitor',
  },
  onboarding: {
    items: [
      {
        icon: Sparkles,
        title: 'Welcome',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/onboarding/welcome',
      },
      {
        icon: FolderPlus,
        title: 'Project Setup',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/onboarding/project-setup',
      },
      {
        icon: Code,
        title: 'Code Setup',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/onboarding/code-setup',
      },
      {
        icon: Settings,
        title: 'Editor Setup',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/onboarding/editor-setup',
      },
      {
        icon: Users,
        title: 'Invite Team',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/onboarding/invite-team',
      },
      {
        icon: CreditCard,
        title: 'Billing',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/onboarding/billing',
      },
    ],
    label: 'Onboarding',
  },
  orgSettings: {
    items: [
      {
        icon: Users,
        title: 'Team Members',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/settings/members',
      },
      {
        icon: CreditCard,
        title: 'Billing',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/settings/billing',
      },
    ],
    label: 'Organization',
  },
  projectSettings: {
    items: [
      {
        icon: KeyRound,
        title: 'API Keys',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: These are URL template placeholders
        url: '/${orgId}/${projectId}/${envName}/settings/api-keys',
      },
    ],
    label: 'Settings',
  },
};
