import logoLight from 'data-base64:~/../assets/logo-light.png';

export const PoweredByLink = () => {
  return (
    <a
      href="https://acme.ai?utm_source=yc-vibe-check-app"
      target="_blank"
      className="flex flex-col gap-1"
      rel="noreferrer"
    >
      <span className="text-sm text-muted-foreground">Powered by</span>
      <img src={logoLight} className="h-5 w-auto" alt="Acme" />
    </a>
  );
};
