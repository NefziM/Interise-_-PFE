import React, { useState, useEffect,useCallback } from "react";
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
import { ChartConfiguration } from 'chart.js/auto';



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
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);
  

  
  useEffect(() => {
    fetchProducts();
  }, [selectedCompany]);
  
  const handleCompanyChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setSelectedCompany(value === "All" ? null : value);
    },
    []
  );

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const allProducts: Product[] = response.data;
      const filteredProducts = selectedCompany ? allProducts.filter(product => product.Company === selectedCompany) : allProducts;
      setFilteredProducts(filteredProducts);
  
      const allUniqueCompanies = Array.from(new Set(allProducts.map(product => product.Company)));
      setAllCompanies(allUniqueCompanies);
        const today = new Date().setHours(0, 0, 0, 0);
        const uniqueProductRefs = new Set<string>();
        let newProductsSet = new Set<string>();
        let modifiedProductsSet = new Set<string>();
        let priceIncreases = 0;
        let priceDecreases = 0;

        filteredProducts.forEach((product: Product) => {
            uniqueProductRefs.add(product.Ref);

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

        setTotalProducts(filteredProducts.length);
        setNewProductsCount(newProductsSet.size);
        setModifiedProductsCount(modifiedProductsSet.size);
        setPriceIncreaseCount(priceIncreases);
        setPriceDecreaseCount(priceDecreases);
        setInitialProducts(filteredProducts);

   
   
        drawAvailabilityChart(filteredProducts);
        drawAvailabilityByCategoryChart(filteredProducts);
        drawMostModifiedProductsChart(filteredProducts);
        drawCategoryDistributionChart(filteredProducts);
        drawPriceChangesChart(filteredProducts, uniqueDates);
        drawCombinedChangesAndNewProductsChart(filteredProducts, uniqueDates);
        drawTopBrandsByCategoryChart(filteredProducts);
  
    } catch (error) {
        console.error('Error fetching products:', error);
    }
};


  

  const drawAvailabilityByCategoryChart = (products: Product[]) => {
    const availabilityByCategory: Record<string, { inStock: number; outOfStock: number; onOrder: number; }> = {};
  
    products.forEach(product => {
      if (!availabilityByCategory[product.Category]) {
        availabilityByCategory[product.Category] = { inStock: 0, outOfStock: 0, onOrder: 0 };
      }
      const stockStatus = product.Stock.toLowerCase();
      switch (stockStatus) {
        case "en stock":
        case "":
          availabilityByCategory[product.Category].inStock++;
          break;
        case "hors stock":
        case "rupture de stock":
        case "en arrivage":
        case "en arrvage" :
        case "en arrivge" :
          availabilityByCategory[product.Category].outOfStock++;
          break;
        case "sur commande":
        case "sur commande 48h":
        case "sur comande":
          availabilityByCategory[product.Category].onOrder++;
          break;
      }
    
    });
  
  
    const categories = Object.keys(availabilityByCategory);
    const inStockData = categories.map(cat => availabilityByCategory[cat].inStock);
    const outOfStockData = categories.map(cat => availabilityByCategory[cat].outOfStock);
    const onOrderData = categories.map(cat => availabilityByCategory[cat].onOrder);
  
    const inStockCanvas = document.getElementById('inStockChart') as HTMLCanvasElement;
    const outOfStockCanvas = document.getElementById('outOfStockChart') as HTMLCanvasElement;
    const onOrderCanvas = document.getElementById('onOrderChart') as HTMLCanvasElement;
  
    if (inStockCanvas && outOfStockCanvas && onOrderCanvas) {
      const inStockCtx = inStockCanvas.getContext('2d');
      const outOfStockCtx = outOfStockCanvas.getContext('2d');
      const onOrderCtx = onOrderCanvas.getContext('2d');
  
      if (inStockCtx && outOfStockCtx && onOrderCtx) {
        new Chart(inStockCtx, {
          type: 'doughnut',
          data: {
            labels: categories,
            datasets: [{
              data: inStockData,
              backgroundColor: ['#6b80bd','#5887ba','#143d8f','#92bae8','#b3daff','#c1cad7','#8da7be','#48a6d9','#969090']

            }]
          },
          options: {
            plugins: {
              title: {
                display: true,
                text: 'Nombre des produits en stock par catégorie'
              }
            }
          }
        });
  
        new Chart(outOfStockCtx, {
          type: 'doughnut',
          data: {
            labels: categories,
            datasets: [{
              data: outOfStockData,
              backgroundColor: ['#6b80bd','#5887ba','#143d8f','#92bae8','#b3daff','#c1cad7','#8da7be','#48a6d9','#969090']

            }]
          },
          options: {
            plugins: {
              title: {
                display: true,
                text: 'Nombre des produits hors stock par catégorie'
              }
            }
          }
        });
  
        new Chart(onOrderCtx, {
          type: 'doughnut',
          data: {
            labels: categories,
            datasets: [{
              data: onOrderData,
              backgroundColor: ['#6b80bd','#5887ba','#143d8f','#92bae8','#b3daff','#c1cad7','#8da7be','#48a6d9','#969090']

            }]
          },
          options: {
            plugins: {
              title: {
                display: true,
                text: ' Nombre des produits sur commande par catégorie'
              }
            }
          }
        });
      }
    }
  };
  
  const drawTopBrandsByCategoryChart = (products: Product[]) => {
    const topBrandsByCategory: Record<string, Record<string, number>> = {};
  
    products.forEach(product => {
      const { Category, Brand } = product;
      if (!topBrandsByCategory[Category]) {
        topBrandsByCategory[Category] = {};
      }
      topBrandsByCategory[Category][Brand] = (topBrandsByCategory[Category][Brand] || 0) + 1;
    });
  
    const top5BrandsByCategory: Record<string, string[]> = {};
    Object.keys(topBrandsByCategory).forEach(category => {
      const brandsCount = topBrandsByCategory[category];
      const top5Brands = Object.keys(brandsCount)
        .sort((a, b) => brandsCount[b] - brandsCount[a])
        .slice(0, 5);
      top5BrandsByCategory[category] = top5Brands;
    });
  
    const categories = Object.keys(top5BrandsByCategory);
    const allBrands: string[] = [];
    categories.forEach(category => {
      allBrands.push(...top5BrandsByCategory[category]);
    });
    const uniqueBrands = Array.from(new Set(allBrands));
    
    const colors = ['#6b80bd','#5887ba','#143d8f','#92bae8','#b3daff','#c1cad7','#8da7be','#48a6d9','#969090'];
    
    const brandColors: Record<string, string> = {};
    uniqueBrands.forEach((brand, index) => {
      brandColors[brand] = colors[index % colors.length];
    });
    
    const datasets = uniqueBrands.map(brand => {
      const data = categories.map(category => top5BrandsByCategory[category].includes(brand) ? topBrandsByCategory[category][brand] : 0);
      return {
        label: `${brand}`,
        data: data,
        backgroundColor: brandColors[brand],
      };
    });
    const ctx = document.getElementById('topBrandsByCategoryChart') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: datasets,
        },
        options: {
          animation: {
            duration: 2000,
            easing: 'easeInOutBounce',
          },
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
            },
          },
          plugins: {
            legend: {
              display: true,
            },
            title: {
              display: true,
              text: 'Top 5 Marques par Catégorie',
            },
          },
          layout: {
            padding: {
              left: 5,  
              right: 5, 
              top: 5,    
              bottom: 5  
            }
          },
          indexAxis: 'y', 
          elements: {
            bar: {
              borderWidth: 1, 
            }
          },
        },
      });
    }
    
  };
  

const drawPriceChangesChart = (products: Product[], recentDates: Date[]) => {
  const priceIncreasesPerDay: Record<string, number> = {};
  const priceDecreasesPerDay: Record<string, number> = {};

  const sortedRecentDates = recentDates.sort((a, b) => a.getTime() - b.getTime());

  sortedRecentDates.forEach(date => {
    const formattedDate = formatDate(date);
    priceIncreasesPerDay[formattedDate] = 0;
    priceDecreasesPerDay[formattedDate] = 0;
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

        if (previousPrice < currentPrice) {
          priceIncreasesPerDay[modDateStr]++;
        } else if (previousPrice > currentPrice) {
          priceDecreasesPerDay[modDateStr]++;
        }
      }
    });
  });

  const sortedDates = Object.keys(priceIncreasesPerDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const ctxIncrease = document.getElementById('priceIncreasesChart') as HTMLCanvasElement;
  const ctxDecrease = document.getElementById('priceDecreasesChart') as HTMLCanvasElement;
  if (ctxIncrease && ctxDecrease) {
    new Chart(ctxIncrease, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Nombre des produits',
          data: sortedDates.map(date => priceIncreasesPerDay[date]),
          borderColor: '#143d8f',
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
            text: 'Produits avec Augmentations de prix'
          }
        }
      }
    });

    new Chart(ctxDecrease, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Nombre des produits',
          data: sortedDates.map(date => priceDecreasesPerDay[date]),
          borderColor: '#143d8f',
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
            text: 'Produits avec Diminutions de Prix'
          }
        }
      }
    });
  }
};



const drawCombinedChangesAndNewProductsChart = (products: Product[], recentDates: Date[]) => {
  const modificationsAndNewProductsPerDay: Record<string, { modifications: number; newProducts: number }> = {};

  recentDates.forEach(date => {
    const formattedDate = formatDate(date);
    modificationsAndNewProductsPerDay[formattedDate] = { modifications: 0, newProducts: 0 };
  });

  products.forEach(product => {
    const ajoutDate = product.DateAjout ? formatDate(new Date(product.DateAjout).toDateString()) : "";
    product.Modifications?.forEach((modification) => {
      const modDateStr = formatDate(new Date(modification.dateModification));
      if (recentDates.some(date => formatDate(date) === modDateStr)) {
        modificationsAndNewProductsPerDay[modDateStr].modifications++;
      }
    });
    if (ajoutDate && recentDates.some(date => formatDate(date) === ajoutDate)) {
      modificationsAndNewProductsPerDay[ajoutDate].newProducts++;
    }
  });

  const sortedDates = Object.keys(modificationsAndNewProductsPerDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const modificationsData = sortedDates.map(date => modificationsAndNewProductsPerDay[date].modifications);
  const newProductsData = sortedDates.map(date => modificationsAndNewProductsPerDay[date].newProducts);

  const ctx = document.getElementById('combinedChangesAndNewProductsChart') as HTMLCanvasElement;
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Produits Modifiés',
          data: modificationsData,
          borderColor: '#143d8f',
          fill: false
        }, {
          label: 'Nouveaux Produits',
          data: newProductsData,
          borderColor: '#48a6d9',
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
            text: 'Produits Modifiés et Nouveaux Produits par Jour'
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
        if (product.Stock === "En stock" || product.Stock === "") {
          competitorsStats[product.Company].inStock++;
        } else if (product.Stock === "Sur commande" || product.Stock ==="sur comande" || product.Stock === "sur commande 48h") {
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
              backgroundColor: '#143d8f'


            }, {
              label: 'Hors stock',
              data: Object.values(competitorsStats).map(stats => stats.outOfStock),
              backgroundColor: '#48a6d9'
            }, {
              label: 'Sur commande',
              data: Object.values(competitorsStats).map(stats => stats.onOrder),
              backgroundColor: '#6b80bd'
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
                backgroundColor: ['#6b80bd','#5887ba','#143d8f','#92bae8','#b3daff','#c1cad7','#8da7be','#48a6d9','#969090'],
                hoverBackgroundColor: ['#6b80bd','#5887ba','#143d8f','#92bae8','#b3daff','#c1cad7','#8da7be','#48a6d9','#969090']


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
              backgroundColor: Array(productLabels.length).fill('#13367E')
            }]
          },
          options: {
            animation: {
              duration: 2000, 
              easing: 'easeInOutBounce'
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1 
                }
              }},
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

    const availableProductsCount = initialProducts.filter(product => ( product.Stock.toLowerCase() === "en stock" || product.Stock === "" )
      && 
      (!selectedCompany || product.Company === selectedCompany)
    ).length;
    
    const validUnavailableStatuses = new Set([
      "sur commande",
      "sur comande",
      "sur commande 48h"
    ]);
    
    const unavailableProductsCount = initialProducts.filter(product => {
      const stockStatus = product.Stock.toLowerCase();
      return validUnavailableStatuses.has(stockStatus) && 
             (!selectedCompany || product.Company === selectedCompany);
    }).length;
    
    
    const validOutOfStockStatuses = new Set([
      "hors stock", 
      "rupture de stock", 
      "en arrivage", 
      "en arrvage", 
      "en arrivge"
    ]);
    
    const horsstockProductsCount = initialProducts.filter(product => {
      const stockStatus = product.Stock.toLowerCase();
      return validOutOfStockStatuses.has(stockStatus) && 
             (!selectedCompany || product.Company === selectedCompany);
    }).length;
  
    
    const companyOptions = Array.from(new Set(initialProducts.map(p => p.Company)));

    return (
      
      <div className={styles.dashboard_content}>
        
        <div className={styles.dashboard_content_container}>
          
      
 
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
 
</div>       
<div>
        <select 
          className="select_company"
          value={selectedCompany || "All"}
          onChange={handleCompanyChange}
        >
          <option value="All" style={{color:'gray'}}>Filtrer par concurrent</option>
          {allCompanies.map((company: string) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
      </div>


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





      
  
  

  <div className="graph-container" >
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

      <div className="row">

      <div className="graph-container">
        <div className="canvas-wrapper">
          <canvas id="combinedChangesAndNewProductsChart" width="700" height="500" style={{alignContent:'center'}}></canvas>
          {showDownloadButtons && (
            <div className="vertical-icon-container">
              <FontAwesomeIcon 
                icon={faImage} 
                onClick={() => downloadChartAsImage('combinedChangesAndNewProductsChart', 'png')} 
                className="icon-button" 
                style={{ cursor: 'pointer' }} 
                title="Download as Image"
              />
              <FontAwesomeIcon 
                icon={faFilePdf} 
                onClick={() => downloadChartAsPDF('combinedChangesAndNewProductsChart', '')} 
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
    <canvas id="priceIncreasesChart" width="700" height="500"></canvas>
    {showDownloadButtons && (
      <div className="vertical-icon-container">
        <FontAwesomeIcon 
          icon={faImage} 
          onClick={() => downloadChartAsImage('priceIncreasesChart', 'png')} 
          className="icon-button" 
          style={{ cursor: 'pointer' }} 
          title="Download as Image"
        />
        <FontAwesomeIcon 
          icon={faFilePdf} 
          onClick={() => downloadChartAsPDF('priceIncreasesChart', 'Price Increases Chart')} 
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
    <canvas id="priceDecreasesChart" width="700" height="500"></canvas>
    {showDownloadButtons && (
      <div className="vertical-icon-container">
        <FontAwesomeIcon 
          icon={faImage} 
          onClick={() => downloadChartAsImage('priceDecreasesChart', 'png')} 
          className="icon-button" 
          style={{ cursor: 'pointer' }} 
          title="Download as Image"
        />
        <FontAwesomeIcon 
          icon={faFilePdf} 
          onClick={() => downloadChartAsPDF('priceDecreasesChart', 'Price Decreases Chart')} 
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
    <canvas id="inStockChart" width="700" height="500"></canvas>
    {showDownloadButtons && (
      <div className="vertical-icon-container">
        <FontAwesomeIcon 
          icon={faImage} 
          onClick={() => downloadChartAsImage('inStockChart', 'png')} 
          className="icon-button" 
          style={{ cursor: 'pointer' }} 
          title="Download as Image"
        />
        <FontAwesomeIcon 
          icon={faFilePdf} 
          onClick={() => downloadChartAsPDF('inStockChart', 'inStockChart')} 
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
    <canvas id="outOfStockChart" width="700" height="500"></canvas>
    {showDownloadButtons && (
      <div className="vertical-icon-container">
        <FontAwesomeIcon 
          icon={faImage} 
          onClick={() => downloadChartAsImage('outOfStockChart', 'png')} 
          className="icon-button" 
          style={{ cursor: 'pointer' }} 
          title="Download as Image"
        />
        <FontAwesomeIcon 
          icon={faFilePdf} 
          onClick={() => downloadChartAsPDF('outOfStockChart', 'outOfStockChart')} 
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
    <canvas id="onOrderChart" width="700" height="500"></canvas>
    {showDownloadButtons && (
      <div className="vertical-icon-container">
        <FontAwesomeIcon 
          icon={faImage} 
          onClick={() => downloadChartAsImage('onOrderChart', 'png')} 
          className="icon-button" 
          style={{ cursor: 'pointer' }} 
          title="Download as Image"
        />
        <FontAwesomeIcon 
          icon={faFilePdf} 
          onClick={() => downloadChartAsPDF('onOrderChart', 'onOrderChart')} 
          className="icon-button" 
          style={{ cursor: 'pointer' }} 
          title="Download as PDF"
        />
      </div>
    )}
  </div>
</div>




</div>

<div className="roww">
  <div className="graph-containerr" > 
    <div className="canvas-wrapperr" >
      <canvas id="topBrandsByCategoryChart" width="400" height="300"></canvas>
      {showDownloadButtons && (
        <div className="vertical-icon-container">
          <FontAwesomeIcon 
            icon={faImage} 
            onClick={() => downloadChartAsImage('topBrandsByCategoryChart', 'png')} 
            className="icon-button" 
            style={{ cursor: 'pointer' }} 
            title="Download as Image"
          />
          <FontAwesomeIcon 
            icon={faFilePdf} 
            onClick={() => downloadChartAsPDF('topBrandsByCategoryChart', 'topBrandsByCategoryChart')} 
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
   
      </div>
      
    );
  };


      
  