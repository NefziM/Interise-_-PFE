import React, { useState, useEffect } from "react";
import { DashboardComponents } from "@components";
import axios from 'axios';
import { ROUTES } from "@utils";
import styles from "../dashboard.module.css";

interface Product {
  Ref: string;
  supprime: boolean;
  DateModification?: Date;  // "?" pour indiquer que l'attribut peut être absent
  DateAjout?: Date;
}

export const Dashboard = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [newProductsCount, setNewProductsCount] = useState(0);
  const [modifiedProductsCount, setModifiedProductsCount] = useState(0);
  const [deletedProductsCount, setDeletedProductsCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const products: Product[] = response.data;

      let allProductsSet = new Set<string>();
      let newProductsSet = new Set<string>();
      let modifiedProductsSet = new Set<string>();
      let deletedProductsSet = new Set<string>();

      const today = new Date().setHours(0, 0, 0, 0); // Aujourd'hui à minuit

      products.forEach((product: Product) => {
        allProductsSet.add(product.Ref);

        if (product.DateAjout) {
          const ajoutDate = new Date(product.DateAjout).setHours(0, 0, 0, 0);
          if (ajoutDate === today) {
            newProductsSet.add(product.Ref);
          }
        }

        if (product.DateModification) {
          const modificationDate = new Date(product.DateModification).setHours(0, 0, 0, 0);
          if (modificationDate === today) {
            modifiedProductsSet.add(product.Ref);
          }
        }

        if (product.supprime && !deletedProductsSet.has(product.Ref)) {
          deletedProductsSet.add(product.Ref);
        }
      });

      setTotalProducts(allProductsSet.size);
      setNewProductsCount(newProductsSet.size);
      setModifiedProductsCount(modifiedProductsSet.size);
      setDeletedProductsCount(deletedProductsSet.size);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  return (
    <div className={styles.dashboard_content}>
      <div className={styles.dashboard_content_container}>
        <div className={styles.dashboard_content_header}>
        </div>

        <div className={styles.dashboard_content_cards}>
          <DashboardComponents.StatCard
            title="Tous les Produits"
            link={ROUTES.PRODUCTS}
            value={totalProducts}
            icon="/icons/product.svg"
          />
          <DashboardComponents.StatCard
            title="Nouveaux Produits"
            link={ROUTES.NEWPRODUCTS}
            value={newProductsCount}
            icon="/icons/new.svg"
          />
          <DashboardComponents.StatCard
            title="Produits Modifiés"
            link={ROUTES.UPDATE}
            value={modifiedProductsCount}
            icon="/icons/update.svg"
          />
          <DashboardComponents.StatCard
            title="Produits Supprimés"
            link={ROUTES.DELETEDPRODUCTS}
            value={deletedProductsCount}
            icon="/images/suppression.png"
          />
        </div>
      </div>
    </div>
  );
};
