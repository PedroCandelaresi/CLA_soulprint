import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CLA | Tienda principal',
  description: 'Panel principal de accesorios CLA para humanos y mascotas',
};

const LayoutAplicacion = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default LayoutAplicacion;
