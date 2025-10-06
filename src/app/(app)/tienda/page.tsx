import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import AppCard from '@/app/components/shared/AppCard';
import ProductShop from '@/app/components/apps/ecommerce/productGrid';
import { ProductProvider } from '@/app/context/Ecommercecontext';

const migasDePan = [
  {
    to: '/',
    title: 'Inicio',
  },
  {
    title: 'Tienda',
  },
];

const PaginaTienda = () => {
  return (
    <ProductProvider>
      <PageContainer title="Tienda" description="Catálogo en línea de accesorios CLA">
        <Breadcrumb title="Tienda" items={migasDePan} />
        <AppCard>
          <ProductShop />
        </AppCard>
      </PageContainer>
    </ProductProvider>
  );
};

export default PaginaTienda;
