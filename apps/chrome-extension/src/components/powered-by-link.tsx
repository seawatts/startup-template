import logoLight from 'data-base64:~/../assets/logo-light.png';

export const PoweredByLink = () => {
  return (
    <a
      className="flex flex-col gap-1"
      href="https://acme.ai?utm_source=yc-vibe-check-app"
      rel="noreferrer"
      target="_blank"
    >
      <span className="text-sm text-muted-foreground">Powered by</span>
      <img alt="Acme" className="h-5 w-auto" src={logoLight} />
    </a>
  );
};
