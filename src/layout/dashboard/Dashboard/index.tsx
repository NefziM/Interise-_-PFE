import React, { useState, useEffect } from "react";
import axios from 'axios';
import Chart from 'chart.js/auto'; 
import { DashboardComponents } from "@components";
import { ROUTES } from "@utils";
import styles from "../dashboard.module.css";
import './dashboard.css'; 
import { Route } from "react-router-dom";
import { FiArrowUp, FiArrowDown } from 'react-icons/fi'; 


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
  const [priceIncreaseCount, setPriceIncreaseCount] = useState(0);
  const [priceDecreaseCount, setPriceDecreaseCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const products: Product[] = response.data;
      setInitialProducts(products);
  
      const today = new Date().setHours(0, 0, 0, 0);
      const uniqueProductRefs = new Set<string>();
      let newProductsSet = new Set<string>();
      let modifiedProductsSet = new Set<string>();
      let priceIncreases = 0;
      let priceDecreases = 0;
  
      products.forEach((product: Product) => {
        // Ajouter la référence du produit à l'ensemble des références uniques
        uniqueProductRefs.add(product.Ref);
  
        // Vérifier l'ajout de produits nouveaux aujourd'hui
        if (product.DateAjout && new Date(product.DateAjout).setHours(0, 0, 0, 0) === today) {
          newProductsSet.add(product.Ref);
        }
  
        product.Modifications?.forEach((modification, index, modifications) => {
          const modDate = new Date(modification.dateModification).setHours(0, 0, 0, 0);
          if (modDate === today) {
            modifiedProductsSet.add(product.Ref);
            let nextPrice = parseFloat(product.Price.replace(/[^\d.,]/g, "").replace(',', '.'));
            const currentPrice = parseFloat(modification.ancienPrix.replace(/[^\d.,]/g, "").replace(',', '.'));
            if (currentPrice > nextPrice) {
              priceDecreases++;
            } else if (currentPrice < nextPrice) {
              priceIncreases++;
            }
          }
        });
      });
      let allModificationDates: Date[] = products.flatMap(product => 
        product.Modifications?.map(modification => new Date(modification.dateModification)) ?? []
    );
      const uniqueDates = Array.from(new Set(allModificationDates.map(date => date.toISOString().slice(0, 10))))
      .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 7)
      .map((date: string) => new Date(date));
      setTotalProducts(uniqueProductRefs.size);
      setNewProductsCount(newProductsSet.size);
      setModifiedProductsCount(modifiedProductsSet.size);
      setPriceIncreaseCount(priceIncreases);
      setPriceDecreaseCount(priceDecreases);
  
      drawAvailabilityChart(products);
      drawNewProductsChart(products);
      drawModifiedProductsChart(products,uniqueDates);
      drawCategoryDistributionChart(products);
      drawMostModifiedProductsChart(products);
      drawAveragePriceByCategoryChart(products);
      drawPriceChangeCharts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  

  const drawCharts = (products: Product[]) => {

  };


  const drawModifiedProductsChart = (products: Product[], dates: Date[]) => {
    // Créer un dictionnaire pour compter les modifications par jour
    const modifiedProductsPerDay: Record<string, number> = {};
  
    // Initialiser le dictionnaire avec toutes les dates possibles (déjà triées)
    dates.sort((a, b) => a.getTime() - b.getTime()).forEach(date => {
      const formattedDate = formatDate(date);
      modifiedProductsPerDay[formattedDate] = 0;
    });
  
    // Compter les modifications pour chaque produit
    products.forEach((product: Product) => {
      product.Modifications?.forEach(modification => {
        const modDate = formatDate(modification.dateModification);
        if (modifiedProductsPerDay.hasOwnProperty(modDate)) {
          modifiedProductsPerDay[modDate]++;
        }
      });
    });
  
    // Préparation des données pour le graphique
    const labels = Object.keys(modifiedProductsPerDay);
    const data = labels.map(label => modifiedProductsPerDay[label]);
  
    // Configuration et création du graphique
    const ctx = document.getElementById('modifiedProductsChart') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Nombre des Produits Modifiés',
            data,
            borderColor: '#6495ED',
            fill: false
          }]
        },
        options: {
          animation: {
            duration: 2000, 
            easing: 'easeInOutBounce' 
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            legend: {
              display: true
            },
            title: {
              display: true,
              text: 'Nombre des produits modifiés par jour'
            }
          }
        }
      });
    }
  };
  
  
    const drawAvailabilityChart = (products: Product[]) => {
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
              backgroundColor: '#006400'
            }, {
              label: 'Hors stock',
              data: Object.values(competitorsStats).map(stats => stats.outOfStock),
              backgroundColor: 'red'
            }, {
              label: 'Sur commande',
              data: Object.values(competitorsStats).map(stats => stats.onOrder),
              backgroundColor: '#FFD700'
            }]
          },
          options: {
            animation: {
              duration: 2000, 
              easing: 'easeInOutBounce' 
            },
            scales: {
              y: {
                beginAtZero: true
              }
            },
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Disponibilité des Produits par concurrent'
              }
            }
          }
        });
      }
    };
  
    const formatDate = (date: Date | string): string => {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    };
    
    const drawPriceChangeCharts = (products: Product[]) => {
      const priceIncreasesPerDay: Record<string, number> = {};
      const priceDecreasesPerDay: Record<string, number> = {};
  
      products.forEach((product: Product) => {
          product.Modifications?.forEach((modification, index, modifications) => {
              if (index === 0) return; 
              const currentMod = modification;
              const previousMod = modifications[index - 1];
              const modDate = formatDate(currentMod.dateModification);
  
              const previousPrice = parseFloat(previousMod.ancienPrix.replace(/[^\d\.]/g, ""));
              const currentPrice = parseFloat(currentMod.ancienPrix.replace(/[^\d\.]/g, ""));
              console.log(`ModDate: ${modDate}, PrevPrice: ${previousPrice}, CurrPrice: ${currentPrice}`);
  
              if (previousPrice < currentPrice) {
                  priceIncreasesPerDay[modDate] = (priceIncreasesPerDay[modDate] || 0) + 1;
              } else if (previousPrice > currentPrice) {
                  priceDecreasesPerDay[modDate] = (priceDecreasesPerDay[modDate] || 0) + 1;
              }
          });
      });
  
      console.log('Increases:', priceIncreasesPerDay);
      console.log('Decreases:', priceDecreasesPerDay);
  
      drawChart(priceIncreasesPerDay, 'priceIncreasesChart', 'Augmentations de Prix', '#228B22');
      drawChart(priceDecreasesPerDay, 'priceDecreasesChart', 'Diminutions de Prix', '#FF6347');
    };
  
    const drawChart = (data: Record<string, number>, chartId: string, label: string, borderColor: string) => {
      const sortedDates = Object.keys(data).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const recentDates = sortedDates.slice(Math.max(sortedDates.length - 7, 0));
  
      const ctx = document.getElementById(chartId) as HTMLCanvasElement;
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: recentDates,
            datasets: [{
              label: label,
              data: recentDates.map(date => data[date]),
              borderColor: borderColor,
              fill: false
            }]
          },
          options: {
            animation: {
              duration: 2000, 
              easing: 'easeInOutBounce' 
            },
            scales: {
              y: {
                beginAtZero: true
              }
            },
            plugins: {
              legend: {
                display: true
              },
              title: {
                display: true,
                text: label
              }
            }
          }
        });
      }
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
            datasets: [{
              label: 'Nombre des Produits',
              data: recentDates.map(date => newProductsPerDay[date]),
              borderColor: '#00008B',
              fill: false
            }]
          },
          options: {
            animation: {
              duration: 2000, 
              easing: 'easeInOutBounce' 
            },
            scales: {
              y: {
                beginAtZero: true
              }
            },
            plugins: {
              legend: {
                display: true
              },
              title: {
                display: true,
                text: 'Nombre des nouveaux produits ajoutés par Jour'
              }
            }
          }
        });
      }
    };
  
    const drawCategoryDistributionChart = (products: Product[]) => {
      const categoryCounts = products.reduce((acc: Record<string, number>, product) => {
        acc[product.Category] = (acc[product.Category] || 0) + 1;
        return acc;
      }, {});
  
      const ctx = document.getElementById('categoryChart') as HTMLCanvasElement | null;
      if (ctx) {
        const chartContext = ctx.getContext('2d');
        if (chartContext) {
          new Chart(chartContext, {
            type: 'pie',
            data: {
              labels: Object.keys(categoryCounts),
              datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: ['#191970', '#36A2EB', '#FFFF00', '#9ACD32', '#9966FF', '#C71585', '#DB7093', '#006400', '#E6E6FA'],
                hoverBackgroundColor: ['#191970', '#36A2EB', '#FFFF00', '#9ACD32', '#9966FF', '#C71585', '#DB7093', '#006400', '#E6E6FA']
              }]
            },
            options: {
              animation: {
                duration: 2000, 
                easing: 'easeInOutBounce' 
              },
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Distribution des Produits Par Catégorie'
                }
              }
            }
          });
        }
      }
    };
  
   
  
    const drawAveragePriceByCategoryChart = (products: Product[]) => {
      const categoryPrices: Record<string, number[]> = {};
  
      products.forEach(product => {
        const price = parseFloat(product.Price.replace(/[^\d\.]/g, ""));
        if (categoryPrices[product.Category]) {
          categoryPrices[product.Category].push(price);
        } else {
          categoryPrices[product.Category] = [price];
        }
      });
  
      const categoryAveragePrices = Object.keys(categoryPrices).map(category => {
        const prices = categoryPrices[category];
        const averagePrice = prices.reduce((acc, curr) => acc + curr, 0) / prices.length;
        return averagePrice;
      });
  
      const ctx = document.getElementById('averagePriceByCategoryChart') as HTMLCanvasElement;
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: Object.keys(categoryPrices),
            datasets: [{
              label: 'Prix moyen ',
              data: categoryAveragePrices,
              backgroundColor: '#191970',
            }]
          },
          options: {
            animation: {
              duration: 2000, 
              easing: 'easeInOutBounce' 
            },
            scales: {
              y: {
                beginAtZero: true
              }
            },
            plugins: {
              legend: {
                display: true
              },
              title: {
                display: true,
                text: 'Prix Moyen des Produits Par Catégorie'
              }
            }
          }
        });
      }
    };
  
    const drawMostModifiedProductsChart = (products: Product[]) => {
      const productsWithMostModifications = products
        .filter(product => product.Modifications && product.Modifications.length > 0)
        .sort((a, b) => b.Modifications!.length - a.Modifications!.length)
        .slice(0, 5);
  
      const productLabels = productsWithMostModifications.map(product => product.Ref);
      const modificationCounts = productsWithMostModifications.map(product => product.Modifications!.length);
  
      const ctx = document.getElementById('mostModifiedProductsChart') as HTMLCanvasElement;
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: productLabels,
            datasets: [{
              label: 'Nombre modifications ',
              data: modificationCounts,
              backgroundColor: Array(productLabels.length).fill('#6495ED')
            }]
          },
          options: {
            animation: {
              duration: 2000, 
              easing: 'easeInOutBounce'
            },
            scales: {
              y: {
                beginAtZero: true
              }
            },
            plugins: {
              legend: {
                display: true
              },
              title: {
                display: true,
                text: 'Top 5 des Produits avec le Plus de Modifications'
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
              link={ROUTES.NEWPRODUCTS}
              icon="/icons/new.svg"
            />
            <DashboardComponents.StatCard
              title={`Produits Modifiés (${getCurrentDate()})`}
              value={modifiedProductsCount}
              link={ROUTES.UPDATE}
              icon="/icons/update.svg"
              increaseCount={priceIncreaseCount} 
              decreaseCount={priceDecreaseCount} 
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
            
  
            <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="competitorChart" width="400" height="200"></canvas>
          </div>
          
        </div>
  
        <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="newProductsChart" width="400" height="200"></canvas>
          </div>
        </div>
  
        
        <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="modifiedProductsChart" width="400" height="200"></canvas>
          </div></div>   
      
  
  
  <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="priceIncreasesChart" width="400" height="200"></canvas>
          </div></div>
  
  
          <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="priceDecreasesChart" width="400" height="200"></canvas>
          </div></div>
          <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="mostModifiedProductsChart" width="400" height="200"></canvas>
          </div></div>
  
  
  
  
          <div className="graph-container">
          <div className="canvas-wrapper">
            <canvas id="averagePriceByCategoryChart" width="400" height="200"></canvas>
          </div></div>
  
  
          <div className="graph-container" >
          {/*<div className="graph-title">Modified Products Daily</div>*/}
  
          <div className="canvas-wrapper">
            <canvas id="categoryChart" width="400" height="200" ></canvas>
          </div></div>
  
  
          </div>
        </div>
        
      </div>
    );
  };