import DestacadosContent from '@/components/content/DestacadosContent';
import { getFeaturedProducts } from '@/lib/vendure';
import type { Product } from '@/types/product';

export const metadata = {
    title: 'Destacados | CLA Soulprint',
    description: 'Una selección protagonista presentada con la nueva identidad visual inspirada en CLA Soulprint.',
};

export const dynamic = 'force-dynamic';

export default async function DestacadosPage() {
    let featuredProducts: Product[] = [];

    try {
        featuredProducts = await getFeaturedProducts({ take: 12, skip: 0 });
    } catch (error) {
        console.error('Error fetching featured products page data', error);
    }

    return <DestacadosContent featuredProducts={featuredProducts} />;
}
