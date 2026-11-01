import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style>{`
          html, body, #root { height: 100%; width: 100%; margin: 0; }
          body { overflow-x: hidden; -webkit-text-size-adjust: 100%; }
          input, textarea { font-size: 16px !important; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
