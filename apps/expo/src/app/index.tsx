import * as WebBrowser from 'expo-web-browser';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { api } from '~/utils/api';
import { authClient } from '~/utils/auth';

// Required for expo-web-browser to properly dismiss the browser after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

function MobileAuth({ theme }: { theme: (typeof colors)['light'] }) {
  const { data: session } = authClient.useSession();

  const handleSignIn = async () => {
    console.log('[AUTH] Starting sign in...');

    // Let the expo plugin handle URL construction by passing a path starting with "/"
    // The plugin will convert "/" to the proper deep link like "startuptemplate-development://"
    await authClient.signIn.social({
      callbackURL: '/',
      provider: 'google',
    });

    // After OAuth completes, get the session to sync user data
    const newSession = await authClient.getSession();

    // In development, sync the user to local database for local API calls
    if (__DEV__ && newSession?.data?.user) {
      try {
        console.log('[DEV SYNC] Syncing user to local database...');
        const user = newSession.data.user;
        await api.auth.syncFromProduction.mutate({
          user: {
            email: user.email,
            emailVerified: user.emailVerified,
            id: user.id,
            image: user.image,
            name: user.name,
          },
        });
        console.log('[DEV SYNC] User synced successfully');
      } catch (error) {
        // Don't fail the sign-in if sync fails - just log it
        console.warn('[DEV SYNC] Failed to sync user to local DB:', error);
      }
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={[styles.authStatus, { color: theme.foreground }]}>
        {session?.user?.name ? `Hello, ${session.user.name}` : 'Not logged in'}
      </Text>
      <Pressable
        onPress={async () => {
          if (session) {
            await authClient.signOut();
          } else {
            await handleSignIn();
          }
        }}
        style={[styles.authButton, { backgroundColor: theme.destructive }]}
      >
        <Text
          style={[
            styles.authButtonText,
            { color: theme.destructiveForeground },
          ]}
        >
          {session ? 'Sign Out' : 'Sign In with Google'}
        </Text>
      </Pressable>
    </View>
  );
}

const colors = {
  dark: {
    background: '#09090B',
    border: '#27272A',
    destructive: '#DC2626',
    destructiveForeground: '#FAFAFA',
    foreground: '#FAFAFA',
    muted: '#27272A',
    mutedForeground: '#A1A1AA',
  },
  light: {
    background: '#FFFFFF',
    border: '#E5E5E5',
    destructive: '#EF4444',
    destructiveForeground: '#FAFAFA',
    foreground: '#0A0A0A',
    muted: '#F5F5F5',
    mutedForeground: '#737373',
  },
};

export default function Index() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        {/* Logo */}
        <View style={[styles.logo, { backgroundColor: theme.destructive }]}>
          <Text style={styles.logoEmoji}>✨</Text>
        </View>

        {/* Titles */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            Build Faster.
          </Text>
          <Text style={[styles.title, { color: theme.destructive }]}>
            Ship Smarter.
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: theme.mutedForeground }]}>
          The modern startup template for building beautiful cross-platform apps
          with React Native & Expo.
        </Text>

        {/* Auth Section */}
        <MobileAuth theme={theme} />
      </View>

      {/* Stats Section */}
      <View style={[styles.statsContainer, { backgroundColor: theme.muted }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.foreground }]}>
            10K+
          </Text>
          <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>
            Developers
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.foreground }]}>
            50K+
          </Text>
          <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>
            Apps Built
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.foreground }]}>
            99%
          </Text>
          <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>
            Uptime
          </Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Everything You Need
        </Text>

        <View style={styles.featuresGrid}>
          <FeatureCard
            description="Built with performance in mind. Native-first architecture ensures your app feels instant."
            emoji="⚡"
            theme={theme}
            title="Lightning Fast"
          />
          <FeatureCard
            description="Stunning UI components. Dark mode support out of the box."
            emoji="🎨"
            theme={theme}
            title="Beautiful Design"
          />
          <FeatureCard
            description="Enterprise-grade authentication with Better Auth. OAuth, magic links, and more."
            emoji="🔒"
            theme={theme}
            title="Secure Auth"
          />
          <FeatureCard
            description="One codebase for iOS, Android, and Web. Share 95% of your code."
            emoji="📱"
            theme={theme}
            title="Cross-Platform"
          />
        </View>
      </View>

      {/* Testimonial */}
      <View style={[styles.testimonial, { backgroundColor: theme.muted }]}>
        <Text style={[styles.testimonialText, { color: theme.foreground }]}>
          "This template saved us months of development time. The architecture
          is solid and the DX is incredible."
        </Text>
        <View style={styles.testimonialAuthor}>
          <Text style={[styles.authorName, { color: theme.foreground }]}>
            Sarah Chen
          </Text>
          <Text style={[styles.authorTitle, { color: theme.mutedForeground }]}>
            CTO at TechStart
          </Text>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text key={star} style={styles.star}>
              ⭐
            </Text>
          ))}
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Ready to Build?
        </Text>
        <Text style={[styles.ctaDescription, { color: theme.mutedForeground }]}>
          Join thousands of developers who ship faster.
        </Text>
        <MobileAuth theme={theme} />
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.footerLinks}>
          <Pressable>
            <Text style={[styles.footerLink, { color: theme.mutedForeground }]}>
              Privacy
            </Text>
          </Pressable>
          <Pressable>
            <Text style={[styles.footerLink, { color: theme.mutedForeground }]}>
              Terms
            </Text>
          </Pressable>
          <Pressable>
            <Text style={[styles.footerLink, { color: theme.mutedForeground }]}>
              Support
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.copyright, { color: theme.mutedForeground }]}>
          © 2024 Startup Template. Built with ♥
        </Text>
      </View>
    </ScrollView>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
  theme,
}: {
  emoji: string;
  title: string;
  description: string;
  theme: (typeof colors)['light'];
}) {
  return (
    <View style={[styles.featureCard, { backgroundColor: theme.muted }]}>
      <View style={styles.featureHeader}>
        <View
          style={[
            styles.featureIcon,
            { backgroundColor: `${theme.destructive}33` },
          ]}
        >
          <Text style={styles.featureEmoji}>{emoji}</Text>
        </View>
        <Text style={[styles.featureTitle, { color: theme.foreground }]}>
          {title}
        </Text>
      </View>
      <Text
        style={[styles.featureDescription, { color: theme.mutedForeground }]}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  authButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: '100%',
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  authContainer: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  authorName: {
    fontWeight: '600',
  },
  authorTitle: {
    fontSize: 14,
  },
  authStatus: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  copyright: {
    fontSize: 12,
  },
  ctaDescription: {
    textAlign: 'center',
  },
  ctaSection: {
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
    paddingHorizontal: 24,
  },
  description: {
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 300,
    textAlign: 'center',
  },
  featureCard: {
    borderRadius: 16,
    gap: 8,
    padding: 16,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  featureIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  featuresGrid: {
    gap: 12,
  },
  featuresSection: {
    gap: 16,
    marginTop: 32,
    paddingHorizontal: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    gap: 16,
    marginTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  footerLink: {
    fontSize: 14,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  heroSection: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logo: {
    alignItems: 'center',
    borderRadius: 32,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  logoEmoji: {
    fontSize: 48,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  star: {
    fontSize: 20,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
  },
  statsContainer: {
    borderRadius: 16,
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  testimonial: {
    borderRadius: 16,
    gap: 16,
    marginHorizontal: 24,
    marginTop: 32,
    padding: 24,
  },
  testimonialAuthor: {
    alignItems: 'center',
    gap: 4,
  },
  testimonialText: {
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 28,
    textAlign: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
  },
  titleContainer: {
    alignItems: 'center',
    gap: 8,
  },
});
