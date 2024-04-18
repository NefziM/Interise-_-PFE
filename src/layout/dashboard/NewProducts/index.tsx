import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../dashboard.module.css';
import { Input } from '@components';
import { DashboardComponents } from '@components';
import { ROUTES } from "../../../utils/routes";
import { Link } from "react-router-dom";

interface newProduct {
  Ref: string;
  Designation: string;
  Price: string;
  Stock: string;
  Image: string;
  Brand: string;
  BrandImage: string;
  Company: string;
  Link: string;
  DateScrapping: Date;
  DateAjout: Date;
}

const NewProducts: React.FC = () => {
  const [initialProducts, setInitialProducts] = useState<newProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [products, setProducts] = useState<newProduct[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [fetched, setFetched] = useState<number>(0);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const companyOptions = Array.from(new Set(initialProducts.map(product => product.Company)));
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'table' | 'box'>('table');
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null);
const [totalAvailableNewProducts, setTotalAvailableNewProducts] = useState<number>(0);
const [totalUnavailableNewProducts, setTotalUnavailableNewProducts] = useState<number>(0);
const [dateFilter, setDateFilter] = useState<string | null>(null);
  useEffect(() => {
    fetchProducts();
    setFetched(50);
  }, [page, pageSize]);

  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);

    axios
      .get('http://localhost:5000/api/products', {
        params: {
          page,
          pageSize,
        },
      })
      .then((response) => {
        const data: newProduct[] = response.data;
    
        setProducts(data.filter((product: newProduct) => product.DateAjout));
setInitialProducts(data.filter((product: newProduct) => product.DateAjout));

        setLoadingProducts(false);
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
        setLoadingProducts(false);
      });
  }, [page, pageSize]);

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setSearch(value);
      if (value === '') {
        setFetched(50);
        setProducts(initialProducts);
      } else {
        const filteredProducts = initialProducts.filter(
          (product: newProduct) =>
            product.Ref.toLowerCase().includes(value.toLowerCase()) ||
            product.Designation.toLowerCase().includes(value.toLowerCase()) ||
            product.Stock.toLowerCase().includes(value.toLowerCase()) ||
            product.Company.toLowerCase().includes(value.toLowerCase()) ||
            product.Brand.toLowerCase().includes(value.toLowerCase())
        );
        setProducts(filteredProducts);
      }
    },
    [initialProducts]
  );
  const handleCompanyChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setSelectedCompany(value === "All" ? null : value);
    },
    []
  );
  const filterProductsByDateRange = (filteredProducts: newProduct[]) => {
    if (!dateFilter) return filteredProducts;
  
    const currentDate = new Date();
  
    const startDate = new Date(currentDate);
    let endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999); // fin de journée pour "aujourd'hui"

    switch (dateFilter) {
      case 'jour':
        // startDate et endDate sont déjà définis pour aujourd'hui
        break;
      case 'semaine':
        startDate.setDate(currentDate.getDate() - 7);
        endDate = new Date(); // Utiliser la fin du jour courant pour la fin de la semaine, ajustez si nécessaire
        break;
      case 'mois':
        startDate.setMonth(currentDate.getMonth() - 1);
        endDate = new Date(); // Utiliser la fin du jour courant pour la fin du mois, ajustez si nécessaire
        break;
      default:
        return filteredProducts; // Si aucun filtre n'est appliqué, retourner tous les produits
    }
  
    return filteredProducts.filter(product => {
      const productDate = new Date(product.DateAjout);
      return productDate >= startDate && productDate <= endDate;
    });
  };
  

  const handleMinPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMinPrice(value);
    filterProducts(value, maxPrice, 'min');
  };
  
  const handleMaxPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMaxPrice(value);
    filterProducts(minPrice, value, 'max');
  };
  
  const uniqueProducts: newProduct[] = [];
  const uniqueRefs = new Set<string>();
  for (const product of initialProducts) {
    if (!uniqueRefs.has(product.Ref)) {
      uniqueProducts.push(product);
      uniqueRefs.add(product.Ref);
    }
  }

  // Calcul des statistiques de disponibilité
  const availableProductsCount = uniqueProducts.filter(
    (product) => product.Stock === "En stock"
  ).length;
  const unavailableProductsCount = uniqueProducts.filter(
    (product) => product.Stock === "Sur commande"
  ).length;


  
  const filterProducts = (min: string, max: string, filterType: 'min' | 'max') => {
    const minPriceValue = parseFloat(min.replace(/\s/g, '').replace(',', '.'));
    const maxPriceValue = parseFloat(max.replace(/\s/g, '').replace(',', '.'));

    const filteredProducts = initialProducts.filter((product: newProduct) => {
      const price = parseFloat(product.Price.replace(/\s/g, '').replace(',', '.'));

      if (filterType === 'min') {
        return price >= minPriceValue;
      } else if (filterType === 'max') {
        return price <= maxPriceValue;
      }

      return true;
    });

    setInitialProducts(filteredProducts);
  };

  const handlePriceFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setPriceFilter(value === "asc" || value === "desc" ? value : null);
    },
    []
  );

  const handleAvailabilityFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setAvailabilityFilter(value === "available" || value === "unavailable" ? value : null);
    },
    []
  );

  const applyPriceFilter = (filteredProducts: newProduct[]) => {
    const sortedProducts = [...filteredProducts];
    if (priceFilter === "asc") {
      return sortedProducts.sort((a, b) => parseFloat(a.Price.replace(/\s/g, '').replace(',', '.')) - parseFloat(b.Price.replace(/\s/g, '').replace(',', '.')));
    } else if (priceFilter === "desc") {
      return sortedProducts.sort((a, b) => parseFloat(b.Price.replace(/\s/g, '').replace(',', '.')) - parseFloat(a.Price.replace(/\s/g, '').replace(',', '.')));
    } else {
      return sortedProducts;
    }
  };

  const filteredProductsByCompany = selectedCompany
    ? initialProducts.filter(product => product.Company === selectedCompany)
    : initialProducts;

  const filteredProductsByPrice = minPrice !== '' && maxPrice !== ''
    ? filteredProductsByCompany.filter(product => {
      const price = parseFloat(product.Price.replace(/\s/g, '').replace(',', '.'));
      const min = parseFloat(minPrice.replace(/\s/g, '').replace(',', '.'));
      const max = parseFloat(maxPrice.replace(/\s/g, '').replace(',', '.'));
      return price >= min && price <= max;
    })
    : filteredProductsByCompany;

    const filteredProductsByAvailability = availabilityFilter
    ? availabilityFilter === 'available'
      ? filteredProductsByPrice.filter((product) => product.Stock === 'En stock')
      : filteredProductsByPrice.filter((product) => product.Stock === 'Sur commande')
    : filteredProductsByPrice;
  
  const handleDisplayModeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setDisplayMode(event.target.value as 'table' | 'box');
    },
    []
  );
  const resetFilters = useCallback(() => {
    setSearch("");
    setPage(1);
    setPageSize(50);
    setProducts(initialProducts);
    setPriceFilter(null);
    setMinPrice("");
    setMaxPrice("");
    setAvailabilityFilter(null);
    setDateFilter(null);
    setSelectedCompany(null);
  }, [initialProducts]);

  // Appeler la fonction resetFilters lorsque le bouton est cliqué
  const handleResetFilters = () => {
    resetFilters();
  };
  const __handleLoadMore = () => {
    if (initialProducts.length > fetched) {
      const newFetched = fetched + 50;
      setFetched(newFetched);
    }
  };
  const filteredProducts = applyPriceFilter(filteredProductsByAvailability);
  const newProducts = filteredProducts.filter((product: newProduct) => product.DateAjout);
  
  const newAvailableProducts = newProducts.filter(product => product.Stock === 'En stock').length;
  const newUnavailableProducts = newProducts.filter(product => product.Stock === 'Sur commande').length;
  
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + ' ...' : text;
  };
  
  return (
    <div className={`${styles.dashboard_content} products_page product-page-inputs`}>
    <div className={styles.dashboard_content_container}>
      <div className={styles.dashboard_content_header}>
      <Input
            type="text"
            value={search}
            label="Chercher.."
            onChange={(e) => handleSearch(e)}
          />
           <img
      src="/icons/search.gif"
      className={styles.search_icon}/>
      </div>

        <div className={styles.dashboard_content_cards}>
        <DashboardComponents.StatCard
            title="Nouveaux Produits"
            value={uniqueProducts.length}
            icon="/icons/product.svg"
          />
<DashboardComponents.StatCard
  title="Produits Disponibles"
  value={availableProductsCount}
  icon="/icons/product.svg"
/>
<DashboardComponents.StatCard
  title="Produits Épuisés"
  value={unavailableProductsCount}
  icon="/icons/product.svg"
/>


  
        </div>

        <div className={styles.filter_container}>
          <div className={styles.filter_group}>
            <select value={selectedCompany || "All"} onChange={handleCompanyChange}>
              <option value="All" style={{color:'gray'}}>Filtrer par concurrent </option>
              {companyOptions.map((company: string) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filter_group}>
            <select value={dateFilter || ""} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="" style={{color:'gray'}}>Produits ajoutés  </option>
             <option value="jour">aujourd'hui</option>
             <option value="semaine"> cette semaine</option>
             <option value="mois">ce mois</option>
           </select>
         </div>
          <div className={styles.filter_group}>
            <input type="number" value={minPrice} onChange={handleMinPriceChange} placeholder='Prix min' />
          </div>
          
          <div className={styles.filter_group}>
            <input type="number" value={maxPrice} onChange={handleMaxPriceChange} placeholder='Prix max'/>
          </div>
          
          <div className={styles.filter_group}>
            <select value={priceFilter || ""} onChange={handlePriceFilterChange}>
              <option value="" style={{color:'gray'}}>Trier par prix </option>
              <option value="asc">Croissant</option>
              <option value="desc">Décroissant</option>
            </select>
          </div>

          <div className={styles.filter_group}>
            <span className={styles.filter_label}></span>
            <select value={availabilityFilter || ""} onChange={handleAvailabilityFilterChange}>
              <option value="" style={{color:'gray'}}>Filtrer par disponibilité </option>
              <option value="available">Produits Disponibles</option>
              <option value="unavailable">Produits Épuisés</option>
            </select>
          </div>
          <button className={styles.reset_button} onClick={handleResetFilters}><b>X</b></button>

        </div>
        <div>
    <img
      src="/icons/lister.svg"
      alt="Tableau"
      onClick={() => setDisplayMode('table')}
      className={displayMode === 'table' ? styles.selected_icon : styles.icon}
    />
    <img
      src="/icons/table-icon.svg"
      alt="Boîtes"
      onClick={() => setDisplayMode('box')}
      className={displayMode === 'box' ? styles.selected_icon : styles.icon}
    />
  </div><tr></tr>
  {!dateFilter ||loadingProducts ? (
  <p style={{ textAlign: "center" }}><b>Veuillez sélectionner une  date</b></p>
) : products.length === 0 ? (
  <p style={{ textAlign: "center",color:"red" }}><b>Aucun produit trouvé</b></p>
) : displayMode === 'table' ? (
          <table>
            <thead>
                <th>Image</th>
                <th>Référence</th>
                <th>Désignation</th>
                <th>Marque</th>
                <th>Disponibilité</th>
                <th>Date </th>
                <th>Prix</th>

            </thead>
            {newProducts.length > 0 ? (
              <tbody>
              {filterProductsByDateRange(newProducts).slice(0, fetched).map((product: newProduct, index: number) => (
                    <tr key={index}>
                      <td>
                {product.DateAjout && <img src="/images/sign.png" alt="New" style={{width: '35px',height: '35px',position:'absolute',marginLeft:'-15px'}} />}

                        <img src={product.Image} alt={product.Designation} />
                      </td>
                      <td>{product.Ref}</td>
                      <td>
                      <Link
  className="product-details-link"
  to={`${ROUTES.PRODUCTDETAILS}/${product.Ref}`}
>

                          {product.Designation.length > 30
                            ? product.Designation.slice(0, 30) + "..."
                            : product.Designation}
                        
</Link>

                      </td>
                      <td>{product.Brand}</td>
                      <td>
                      <span style={product.Stock === "En stock" ? { color: "green" } : { color: "red" }}>
                          {product.Stock}</span>
                      </td>

                      <td>{new Date(product.DateScrapping).toLocaleDateString()}</td>
                      <td>{product.Price}</td>
                     
                    </tr>
                  ))}
              </tbody>
            ) : null}
          </table>
        ) : (
          <div className={styles.dashboard_content_cards}>
            {filterProductsByDateRange(newProducts).map((product: newProduct, index: number) => (
              <div key={index} className={styles.product_box}>
                <img className={styles.sold_out_overlay} src="/images/new.png" alt="new" />
                <img src={product.Image} alt={product.Designation} />
                <div>
                <h3>
                  <a
                    href={product.Link}
                    target="_blank"
                    style={{ color: "#140863" }}
                  >
                    {product.Designation.length > 30
                      ? product.Designation.slice(0, 30) + "..."
                      : product.Designation}
                  </a>
                </h3>
                  <p>
                  <img
                    src={product.BrandImage}
                    alt={product.Designation}
                    style={{ width: "50px", height: "50px" }}
                  />
                </p>
                  <p> Prix : {product.Price}</p>
                  <p>Disponibilté : {product.Stock}</p>
                  <p>{product.Company}</p>
                  <Link
  className="product-details-link"
  to={`${ROUTES.PRODUCTDETAILS}/${product.Ref}`}
>
  Voir plus
</Link>
                </div>
              </div>
            ))}
          </div>
        )}

      
{!dateFilter || loadingProducts ? null : (
  newProducts.length > fetched ? (
    <span
      className={styles.handle_more_button}
      onClick={__handleLoadMore}
    >
      Charger plus
    </span>
  ) : null
)}

      </div>
    </div>
  );
};

export default NewProducts;