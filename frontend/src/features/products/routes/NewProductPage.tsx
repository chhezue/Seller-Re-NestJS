// features/products/routes/NewProductPage.tsx
import React from 'react';
import ProductForm from '../../products/components/ProductForm';

const NewProductPage: React.FC = () => {
    return <ProductForm mode="create" />;
};

export default NewProductPage;
