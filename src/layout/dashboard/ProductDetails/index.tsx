import React, { useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import './Productdetails.css';
import { FaTimes } from 'react-icons/fa';
import 'chartjs-plugin-annotation';
Chart.defaults.font.family = 'Georgia, serif';

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
  DateScrapping: string;
  Modifications?: Modification[];
  Category: string;
  Subcategory: string;
}

interface Modification {
  dateModification: string;
  ancienPrix: string;
  nouveauPrix: string;
}

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onClose }) => {
  const [priceData, setPriceData] = useState<{ date: Date, price: number }[]>([]);

  useEffect(() => {
    if (product.Modifications && product.Modifications.length > 0) {
      const prices: { date: Date, price: number }[] = [];

      // Ajouter les modifications triées par date
      product.Modifications.sort((a, b) => new Date(a.dateModification).getTime() - new Date(b.dateModification).getTime())
        .forEach(mod => {
          prices.push({
            date: new Date(mod.dateModification),
            price: parseFloat(mod.ancienPrix.split(' ')[0].replace(',', ''))
          });
          prices.push({
            date: new Date(mod.dateModification),
            price: parseFloat(mod.nouveauPrix.split(' ')[0].replace(',', ''))
          });
        });

      setPriceData(prices);
    }
  }, [product]);

  useEffect(() => {
    if (priceData.length > 0) {
      drawPriceChart();
    }
  }, [priceData]);

  const getStepSize = (maxPrice: number) => {
    if (maxPrice <= 1) return 0.05;
    if (maxPrice <= 10) return 1;
    if (maxPrice <= 100) return 10;
    if (maxPrice <= 1000) return 100;
    if (maxPrice <= 10000) return 1000;
    if (maxPrice <= 50000) return 5000;
    return 10000;
  };

  const drawPriceChart = () => {
    const ctx = document.getElementById('priceChart') as HTMLCanvasElement;
    if (ctx) {
      Chart.getChart(ctx)?.destroy();
      const maxPrice = Math.max(...priceData.map(data => data.price));
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: priceData.map(data => data.date.toLocaleDateString()),
          datasets: [{
            label: 'Prix',
            data: priceData.map(data => data.price.toFixed(2)),
            borderColor: '#041172',
            fill: false,
            pointBackgroundColor: '#041172',
            pointBorderColor: '#041172',
            pointHoverRadius: 6,
          }],
        },
        options: {
          scales: {
            y: {
              title: {
                display: true,
                text: 'Prix (DT)',
              },
              beginAtZero: false,
              ticks: {
                stepSize: getStepSize(maxPrice),
                callback: function (value) {
                  return value.toLocaleString();
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `Prix: ${context.parsed.y.toLocaleString()} DT`;
                }
              }
            },
            annotation: {
              annotations: product.Modifications?.map((mod, index) => ({
                type: 'line',
                mode: 'vertical',
                scaleID: 'x',
                value: new Date(mod.dateModification).toLocaleDateString(),
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                label: {
                  content: `Ancien: ${mod.ancienPrix}, Nouveau: ${mod.nouveauPrix}`,
                  enabled: true,
                  position: 'center',
                }
              })) || []
            }
          }
        }
      });
    }
  };

  return (
    <div className="productDetails">
      {product ? (
        <div className="productContainer">
          <div className="productInfo">
            <div className="closeIcon" onClick={onClose}>
              <FaTimes size={30} />
            </div>
            <br />
            <br />
            <div className="productContent">
              <div className="imageChartContainer">
                <img src={product.Image} alt={product.Designation} className="productImage" style={{ width: '200px', height: '200px' }} />
                <div className="chartContainer">
                  <canvas id="priceChart" width="600" height="300"></canvas>
                </div>
              </div>
              <div className="details">
                <h4>Référence : {product.Ref}</h4>
                <h2>{product.Designation}</h2>
                <div>
                  <p style={{ display: 'inline-block', marginRight: '30px', color: "red" }}>
                    <b>
                      <span style={{ fontSize: '24px' }}>
                        {product.Price.split(',')[0]}
                      </span>
                      <span style={{ fontSize: '18px' }}>
                        {',' + product.Price.split(',')[1]}
                      </span>
                    </b>
                  </p>
                  {product.Modifications && product.Modifications.length > 0 && (
                    <p style={{ display: 'inline-block' }}>
                      <span style={{ textDecoration: "line-through", color: "gray" }}>
                        <span style={{ fontSize: '20px' }}>
                          {product.Modifications[product.Modifications.length - 1].ancienPrix.split(',')[0]}
                        </span>
                        <span style={{ fontSize: '14px' }}>
                          {',' + product.Modifications[product.Modifications.length - 1].ancienPrix.split(',')[1]}
                        </span>
                      </span>
                    </p>
                  )}
                </div>
                <p>{product.Description}</p>
                <p>Disponibilité : <span style={{ color: product.Stock === "En stock" ? 'green' : 'red' }}>{product.Stock}</span></p>
                <div className="logos">
                  <img src={product.CompanyLogo} alt={product.Company} style={{ width: '80px', height: '40px', backgroundColor: '#DCDCE7' }} />
                  <img src={product.BrandImage} alt={product.Brand} style={{ width: '40px', height: '40px', marginLeft: '10px' }} />
                </div>
                <br />
                <div style={{ textAlign: "center" }}>
                  <button className="ConsulterButton">
                    <a href={product.Link} target="_blank" rel="noopener noreferrer">Voir sur site</a>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>Chargement des détails du produit...</p>
      )}
    </div>
  );
};

export default ProductDetails;