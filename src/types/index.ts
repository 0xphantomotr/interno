import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { PortableTextBlock } from '@portabletext/types';

export interface Post {
    _id: string;
    title: string;
    slug: { current: string };
    mainImage: SanityImageSource;
    body?: PortableTextBlock[];
    excerpt?: string;
    author?: {
        name: string;
        image: SanityImageSource;
    };
    categories?: Category[];
    subcategories?: Subcategory[];
    _createdAt?: string;
    font?: string;
    viewCount?: number;
    heroFeatured?: boolean;
}

export interface Category {
    _id: string;
    title: string;
    description?: string;
    slug: { current: string };
    posts?: Post[];
    subcategories?: Subcategory[];
}

export interface Subcategory {
    _id?: string;
    title: string;
    slug: { current: string };
    description?: string;
    parent?: {
        slug: { current: string };
    };
}
