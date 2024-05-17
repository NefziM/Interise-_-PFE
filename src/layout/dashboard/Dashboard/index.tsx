import React, { useState, useEffect } from "react";
import axios from 'axios';
import Chart from 'chart.js/auto'; 
import { DashboardComponents } from "@components";
import { ROUTES } from "@utils";
import styles from "../dashboard.module.css";
import './dashboard.css'; 
import jsPDF from 'jspdf';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';



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
  nouveauPrix:string;
}

const getCurrentDate = () => {
  const today = new Date();
  return today.toLocaleDateString('fr-FR'); 
};


const downloadChartAsImage = (chartId: string, imageFormat: 'png' | 'jpeg' = 'png') => {
  const canvas = document.getElementById(chartId) as HTMLCanvasElement;
  if (canvas) {
    const imageURI = canvas.toDataURL(`image/${imageFormat}`);
    const link = document.createElement('a');
    link.download = `${chartId}.${imageFormat}`;
    link.href = imageURI;
    link.click();
  }
};

const downloadChartAsPDF = (chartId: string, title: string) => {
  const canvas = document.getElementById(chartId) as HTMLCanvasElement;
  if (canvas) {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
    });
    pdf.addImage(imgData, 'PNG', 10, 10, 280, 150);
    pdf.text(title, 10, 10);
    pdf.save(`${title}.pdf`);
  }
};

export const Dashboard = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [newProductsCount, setNewProductsCount] = useState(0);
  const [modifiedProductsCount, setModifiedProductsCount] = useState(0);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const [priceIncreaseCount, setPriceIncreaseCount] = useState(0);
  const [priceDecreaseCount, setPriceDecreaseCount] = useState(0);
  const [showDownloadButtons, setShowDownloadButtons] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showGraph, setShowGraph] = useState(true);


  useEffect(() => {
    fetchProducts();
}, [selectedCompany]);  


  const fetchProducts = async () => {
    try {
        const response = await axios.get('http://localhost:5000/api/products');
        const allProducts: Product[] = response.data;
        const filteredProducts = selectedCompany ? allProducts.filter(product => product.Company === selectedCompany) : allProducts;


        setInitialProducts(filteredProducts);

        const today = new Date().setHours(0, 0, 0, 0);
        const uniqueProductRefs = new Set<string>();
        let newProductsSet = new Set<string>();
        let modifiedProductsSet = new Set<string>();
        let priceIncreases = 0;
        let priceDecreases = 0;

        filteredProducts.forEach((product: Product) => {
            // Ajouter la référence du produit à l'ensemble des références uniques
            uniqueProductRefs.add(product.Ref);

            // Vérifier l'ajout de produits nouveaux aujourd'hui
            if (product.DateAjout && new Date(product.DateAjout).setHours(0, 0, 0, 0) === today) {
                newProductsSet.add(product.Ref);
            }

            

            product.Modifications?.forEach((modification) => {
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

        let allModificationDates: Date[] = filteredProducts.flatMap(product => 
            product.Modifications?.map(modification => new Date(modification.dateModification)) ?? []
        );
        const uniqueDates = Array.from(new Set(allModificationDates.map(date => date.toISOString().slice(0, 10))))
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 7)
        .map((date: string) => new Date(date));

        // Set the total products to the length of filtered products
        setTotalProducts(filteredProducts.length);
        setNewProductsCount(newProductsSet.size);
        setModifiedProductsCount(modifiedProductsSet.size);
        setPriceIncreaseCount(priceIncreases);
        setPriceDecreaseCount(priceDecreases);
        setInitialProducts(filteredProducts);

        // Drawing charts with filtered products
        drawAvailabilityChart(filteredProducts);
        drawNewProductsChart(filteredProducts);
        drawCategoryDistributionChart(filteredProducts);
        drawMostModifiedProductsChart(filteredProducts);
        drawAveragePriceByCategoryChart(filteredProducts);
        drawProductAvailabilityByCategoryChart(filteredProducts);
        drawPriceChangesChart(filteredProducts, uniqueDates);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
};


  const drawCharts = (products: Product[]) => {

  };


  const drawProductAvailabilityByCategoryChart = (products: Product[]) => {
    const availabilityByCategory: Record<string, { inStock: number; outOfStock: number; onOrder: number; }> = {};
  
    // Aggregate data by category
    products.forEach(product => {
      if (!availabilityByCategory[product.Category]) {
        availabilityByCategory[product.Category] = { inStock: 0, outOfStock: 0, onOrder: 0 };
      }
      switch (product.Stock) {
        case "En stock":
          availabilityByCategory[product.Category].inStock++;
          break;
        case "Hors stock":
        case "Rupture de stock":
        case "En arrivage":
          availabilityByCategory[product.Category].outOfStock++;
          break;
        case "Sur commande":
          availabilityByCategory[product.Category].onOrder++;
          break;
      }
    });
    
  
    // Prepare chart data
    const categories = Object.keys(availabilityByCategory);
    const inStock = categories.map(cat => availabilityByCategory[cat].inStock);
    const outOfStock = categories.map(cat => availabilityByCategory[cat].outOfStock);
    const onOrder = categories.map(cat => availabilityByCategory[cat].onOrder);
  
    // Set up the canvas and context
    const canvas = document.getElementById('availabilityByCategoryChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [
            {
              label: 'En stock',
              data: inStock,
              backgroundColor: '#006400'
            },
            {
              label: 'Hors stock',
              data: outOfStock,
              backgroundColor: 'red'
            },
            {
              label: 'Sur commande',
              data: onOrder,
              backgroundColor: '#FFD700'
            }
          ]
        },
        options: {
          scales: {
            x: {
              stacked: false // Ensure the bars are not stacked
            },
            y: {
              stacked: false, // Ensure the bars are not stacked
              beginAtZero: true
            }
          },
          plugins: {
            legend: {
              position: 'top'
            },
            title: {
              display: true,
              text: 'Disponibilité des Produits par Catégorie'
            }
          }
        }
      });
    }
};






const drawPriceChangesChart = (products: Product[], recentDates: Date[]) => {
  const priceIncreasesPerDay: Record<string, number> = {};
  const priceDecreasesPerDay: Record<string, number> = {};
  const modificationsPerDay: Record<string, number> = {};

  // Trier les dates avant de les utiliser
  const sortedRecentDates = recentDates.sort((a, b) => a.getTime() - b.getTime());

  sortedRecentDates.forEach(date => {
    const formattedDate = formatDate(date);
    priceIncreasesPerDay[formattedDate] = 0;
    priceDecreasesPerDay[formattedDate] = 0;
    modificationsPerDay[formattedDate] = 0;
  });

  products.forEach((product: Product) => {
    product.Modifications?.forEach((modification) => {
      const modDateStr = formatDate(new Date(modification.dateModification));
      if (sortedRecentDates.some(date => formatDate(date) === modDateStr)) {
        const previousPrice = parseFloat(modification.ancienPrix.replace(/[^\d.,]/g, "").replace(',', '.'));
        let currentPrice = previousPrice;
        if (modification.nouveauPrix) {
          currentPrice = parseFloat(modification.nouveauPrix.replace(/[^\d.,]/g, "").replace(',', '.'));
        }

        modificationsPerDay[modDateStr]++;
        if (previousPrice < currentPrice) {
          priceIncreasesPerDay[modDateStr]++;
        } else if (previousPrice > currentPrice) {
          priceDecreasesPerDay[modDateStr]++;
        }
      }
    });
  });

  const sortedDates = Object.keys(modificationsPerDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const ctx = document.getElementById('combinedPriceChangesChart') as HTMLCanvasElement;
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
            label: 'Modifications Totales',
            data: sortedDates.map(date => modificationsPerDay[date]),
            borderColor: '#6495ED',
            fill: false
          }, {
            label: 'Augmentations de Prix',
            data: sortedDates.map(date => priceIncreasesPerDay[date]),
            borderColor: '#228B22',
            fill: false
          }, {
            label: 'Diminutions de Prix',
            data: sortedDates.map(date => priceDecreasesPerDay[date]),
            borderColor: '#C71585',
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
            text: 'Changements de Prix et Modifications'
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
 const availableProductsCount = initialProducts.filter(product => product.Stock === "En stock" && (!selectedCompany || product.Company === selectedCompany)).length;
const unavailableProductsCount = initialProducts.filter(product => product.Stock === "Sur commande" && (!selectedCompany || product.Company === selectedCompany)).length;
const horsstockProductsCount = initialProducts.filter(product => ["Hors stock", "Rupture de stock", "En arrivage"].includes(product.Stock) && (!selectedCompany || product.Company === selectedCompany)).length;

    const companyOptions = Array.from(new Set(initialProducts.map(p => p.Company)));

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
 
</div>       <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="select_company">
    <option value="">Sélectionnez un concurrent</option>
    {companyOptions.map(company => (
        <option key={company} value={company}>{company}</option>
    ))}
  </select>

<div className="row">
           <div className="graph-container">
        <div className="canvas-wrapper">
          <canvas id="competitorChart" width="700" height="500"></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('competitorChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('competitorChart', 'Competitor Chart')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>




     


        <div className="graph-container">
          
     {/*   <div className="icon-toggle" style={{ cursor: 'pointer' }} onClick={() => setShowGraph(!showGraph)}>
    <FontAwesomeIcon icon={showGraph ? faEyeSlash : faEye} className="eye_icon" /> {showGraph ? "" : ""} 
        </div>{showGraph && <canvas id="someChartId"></canvas>}  */ }

        <div className="canvas-wrapper">
  

          <canvas id="availabilityByCategoryChart" width="700" height="500"></canvas>
   



          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('availabilityByCategoryChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('availabilityByCategoryChart', '')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>




      <div className="graph-container">
        <div className="canvas-wrapper">
          <canvas id="averagePriceByCategoryChart" width="700" height="500"></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('averagePriceByCategoryChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('averagePriceByCategoryChart', '')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>

</div>

<div className="row">

      <div className="graph-container">
        <div className="canvas-wrapper">
          <canvas id="newProductsChart" width="700" height="500"></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('newProductsChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('newProductsChart', '')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>





      <div className="graph-container">
        <div className="canvas-wrapper">
          <canvas id="combinedPriceChangesChart" width="700" height="500"></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('combinedPriceChangesChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('combinedPriceChangesChart', '')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>






         


      <div className="graph-container">
        <div className="canvas-wrapper">
          <canvas id="mostModifiedProductsChart" width="700" height="500"></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('mostModifiedProductsChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('mostModifiedProductsChart', '')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>

</div>



      
  
  

  <div className="graph-container" style={{marginLeft:'470px'}}>
        <div className="canvas-wrapper">
          <canvas id="categoryChart" width="700" height="500"></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('categoryChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('categoryChart', '')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as PDF"
              />
            </div>
          )}
        </div>
      </div>
  
        
  
  
      

       
    
        </div>
   
      </div>
      
    );
  };
  