import React, { useState, useEffect } from "react";
import axios from 'axios';
import Chart from 'chart.js/auto'; 
import { DashboardComponents } from "@components";
import { ROUTES } from "@utils";
import styles from "../dashboard.module.css";

interface Product {
  Ref: string;
  Designation: string;
  Price: string;
  Stock: string;
  Image: string;
  Brand: string;
  Company: string;
  CompanyLogo: string;
  DiscountAmount: string;
  Description: string;
  BrandImage: string;
  Link: string;
  DateScrapping: Date;
  DateAjout?: Date;
  AncienPrix?: string;
  DateModification?: Date;
  Modifications?: Modification[];
  supprime?: number;
  Category: string;
  Subcategory: string;
}

interface Modification {
  dateModification: Date;
  ancienPrix: string;
}

const getCurrentDate = () => {
  const today = new Date();
  return today.toLocaleDateString('fr-FR'); 
};


export const Dashboard = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [newProductsCount, setNewProductsCount] = useState(0);
  const [modifiedProductsCount, setModifiedProductsCount] = useState(0);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const products: Product[] = response.data;
      setInitialProducts(products);
      
      const today = new Date().setHours(0, 0, 0, 0);
      let newProductsSet = new Set<string>();
      let modifiedProductsSet = new Set<string>();

      products.forEach((product: Product) => {
        if (product.DateAjout && new Date(product.DateAjout).setHours(0, 0, 0, 0) === today) {
          newProductsSet.add(product.Ref);
        }

        if (product.Modifications && product.Modifications.some(mod => new Date(mod.dateModification).setHours(0, 0, 0, 0) === today)) {
          modifiedProductsSet.add(product.Ref);
        }
      });

      setTotalProducts(products.length);
      setNewProductsCount(newProductsSet.size);
      setModifiedProductsCount(modifiedProductsSet.size);
      
      drawAvailabilityChart (products);

      drawNewProductsChart(products);

      drawModifiedProductsChart(products);

      drawCharts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const drawCharts = (products: Product[]) => {

  };


  const  drawAvailabilityChart  = (products: Product[]) => {
    const competitorsStats: Record<string, { inStock: number, outOfStock: number, onOrder: number }> = {};
    products.forEach(product => {
      if (!competitorsStats[product.Company]) {
        competitorsStats[product.Company] = { inStock: 0, outOfStock: 0, onOrder: 0 };
      }
      if (product.Stock === "En stock") {
        competitorsStats[product.Company].inStock++;
      } else if (product.Stock === "Sur commande") {
        competitorsStats[product.Company].onOrder++;
      } else {
        competitorsStats[product.Company].outOfStock++;
      }
    });

    const ctx = document.getElementById('competitorChart') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(competitorsStats),
          datasets: [{
            label: 'En stock',
            data: Object.values(competitorsStats).map(stats => stats.inStock),
            backgroundColor: '#006400	'
          }, {
            label: 'Hors stock',
            data: Object.values(competitorsStats).map(stats => stats.outOfStock),
            backgroundColor: 'red'
          }, {
            label: 'Sur commande',
            data: Object.values(competitorsStats).map(stats => stats.onOrder),
            backgroundColor: '#FFD700	'
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };
  
  const drawNewProductsChart = (products: Product[]) => {
    const newProductsPerDay: Record<string, number> = {};
    products.forEach((product: Product) => {
      const ajoutDate = product.DateAjout ? formatDate(new Date(product.DateAjout).toDateString()) : "";
      if (ajoutDate) {
        newProductsPerDay[ajoutDate] = (newProductsPerDay[ajoutDate] || 0) + 1;
      }
    });
  
    const sortedDates = Object.keys(newProductsPerDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const recentDates = sortedDates.slice(Math.max(sortedDates.length - 7, 0));
  
    const ctx = document.getElementById('newProductsChart') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
     
            type: 'line',
            data: {
                labels: recentDates,
                datasets: [
                    {
                        label: 'Nouveaux Produits',
                        data: recentDates.map(date => newProductsPerDay[date]),
                        borderColor: '#00008B',
                        fill: false
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
};

const drawModifiedProductsChart = (products: Product[]) => {
  const modifiedProductsPerDay: Record<string, number> = {};
  products.forEach((product: Product) => {
    if (product.Modifications) {
      product.Modifications.forEach(mod => {
        const modifDate = mod.dateModification ? formatDate(new Date(mod.dateModification).toDateString()) : "";
        if (modifDate) {
          modifiedProductsPerDay[modifDate] = (modifiedProductsPerDay[modifDate] || 0) + 1;
        }
      });
    }
  });

  const sortedDates = Object.keys(modifiedProductsPerDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const recentDates = sortedDates.slice(Math.max(sortedDates.length - 7, 0));

  const ctx = document.getElementById('modifiedProductsChart') as HTMLCanvasElement;
  if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: recentDates,
                datasets: [
                    {
                        label: 'Produits Modifiés',
                        data: recentDates.map(date => modifiedProductsPerDay[date]),
                        borderColor: '#6495ED',
                        fill: false
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
};

 



  const availableProductsCount = initialProducts.filter(product => product.Stock === "En stock").length;
  const unavailableProductsCount = initialProducts.filter(product => product.Stock === "Sur commande").length;
  const horsstockProductsCount = initialProducts.filter(product => product.Stock === "Hors stock").length;

  return (
    <div className={styles.dashboard_content}>
      <div className={styles.dashboard_content_container}>
        <div className={styles.dashboard_content_header}>
        </div>

        <div className={styles.dashboard_cards}>
          <DashboardComponents.StatCard
            title="Tous les Produits"
            link={ROUTES.PRODUCTS}
            value={totalProducts}
            icon="/icons/product.svg"
          />
         <DashboardComponents.StatCard
            title={`Nouveaux Produits (${getCurrentDate()})`}
            value={newProductsCount}
            icon="/icons/new.svg"
          />
          <DashboardComponents.StatCard
            title={`Produits Modifiés (${getCurrentDate()})`}
            value={modifiedProductsCount}
            icon="/icons/update.svg"
          />
          <DashboardComponents.StatCard
            title="Produits En Stock"
            value={availableProductsCount}
            icon="/icons/product.svg"
          />
          <DashboardComponents.StatCard
            title="Produits Hors stock"
            value={horsstockProductsCount}
            icon="/images/suppression.png"
          />
          <DashboardComponents.StatCard
            title="Produits sur commandes"
            value={unavailableProductsCount}
            icon="/icons/product.svg"
          />
          
          <div>
            <canvas id="competitorChart" width="400" height="200"></canvas>
          </div>
          <div>
            <canvas id="newProductsChart" width="400" height="200"></canvas>
          </div>
          <div>
            <canvas id="modifiedProductsChart" width="400" height="200"></canvas>
          </div>
       
        </div>
      </div>
    </div>
  );
};
