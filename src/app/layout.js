import '@/styles/global.css'

import { Providers } from '@/context/Providers';
import { MainLayout } from '@/layouts/MainLayout';

import { ToastUI } from '@/components/ToastUI';

export const metadata = {
  title: "DeSo NextJS Starter App",
  description: "Designed by @brootle",
};

export default function RootLayout({ children, modal }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <MainLayout>
            {children}
            {modal}
          </MainLayout>
        </Providers>
        <ToastUI />
      </body>
    </html>
  );
}