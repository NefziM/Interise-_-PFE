import axios from "axios";
import styles from "../dashboard.module.css";
import { Input } from "@components";
import { DashboardComponents } from "@components";
import "./productPage.css";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ROUTES } from "../../../utils/routes";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx"; 
import ProductDetails from '../ProductDetails';
interface Product {
  Ref: string;
  Designation: string;
  Price: string;
  Stock: string;
  Image: string;
  Brand: string;
  Company: string;
  DiscountAmount: string;
  BrandImage: string;
  Link: string;
  DateScrapping: string;
  DateAjout?: Date;
  Modifications?: Modification[];
  Category: string;
  Subcategory: string;
  CompanyLogo: string; 
  Description: string; 
}

interface Modification {
  dateModification: string;
  ancienPrix:string;
}
const getCurrentDate = () => {
  const today = new Date();
  return today.toLocaleDateString('fr-FR'); 
};
const Products: React.FC = () => {
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [products, setProducts] = useState<Product[]>([]);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [fetched, setFetched] = useState<number>(0);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [priceIncreaseCount, setPriceIncreaseCount] = useState(0);
  const [priceDecreaseCount, setPriceDecreaseCount] = useState(0);
  const companyOptions = Array.from(
    new Set(initialProducts.map((product) => product.Company))
  );
  const [availableProductsCount, setAvailableProductsCount] = useState(0);
const [unavailableProductsCount, setUnavailableProductsCount] = useState(0);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"table" | "box">("table");
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(
    null
  );
  const [totalProducts, setTotalProducts] = useState(0);
  const [newProductsCount, setNewProductsCount] = useState(0);
  const [modifiedProductsCount, setModifiedProductsCount] = useState(0);
  const [deletedProductsCount, setDeletedProductsCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };
  const today = useMemo(() => new Date(), []);
  const toggleDialog = () => {
    setDialogOpen(!dialogOpen);
  };
  const DialogContent = () => (
    <div className={styles.dialog_content}>
      <span className={styles.close_button} onClick={toggleDialog}><b>×</b></span>
     Le : {getCurrentDate()}
      <p>
        <Link
          className="product-details-link"
          to={`${ROUTES.NEWPRODUCTS}`}
          style={{ textDecoration: 'none', color: 'white' }}
        >
          Nouveaux produits : {newProductsCount}
        </Link>
      </p>
      <p>
        <Link
          className="product-details-link"
          to={`${ROUTES.UPDATE}`}
          style={{ textDecoration: 'none', color: 'white' }}
        >
          Produits modifiés : {modifiedProductsCount}
        </Link>
      </p>
    </div>
  );
  useEffect(() => {
    fetchProducts();
    setFetched(50);
  }, [page, pageSize]); 
  useEffect(() => {
    const filteredProducts = initialProducts.filter((product) => {
      const meetsPriceCriteria =
        (!minPrice || parseFloat(product.Price.replace(/\s/g, '').replace(',', '.')) >= parseFloat(minPrice.replace(/\s/g, '').replace(',', '.'))) &&
        (!maxPrice || parseFloat(product.Price.replace(/\s/g, '').replace(',', '.')) <= parseFloat(maxPrice.replace(/\s/g, '').replace(',', '.')));
  
      const meetsStockCriteria = !availabilityFilter || 
        (availabilityFilter === "available" && product.Stock === "En stock") ||
        (availabilityFilter === "unavailable" && product.Stock === "Sur commande") ||
        (availabilityFilter === "horstock" && product.Stock === "Hors stock");
  
      const meetsPriceFilter = !priceFilter || priceFilter === 'asc' || priceFilter === 'desc';
  
      const meetsSearchCriteria = !search || 
        product.Ref.toLowerCase().includes(search.toLowerCase()) ||
        product.Designation.toLowerCase().includes(search.toLowerCase()) ||
        product.Stock.toLowerCase().includes(search.toLowerCase()) ||
        product.Company.toLowerCase().includes(search.toLowerCase()) ||
        product.Brand.toLowerCase().includes(search.toLowerCase());
  
      return meetsPriceCriteria && meetsStockCriteria && meetsPriceFilter && meetsSearchCriteria;
    });
  
    setProducts(filteredProducts);
  }, [initialProducts, minPrice, maxPrice, availabilityFilter, priceFilter, search]);
  
  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);
    axios.get("http://localhost:5000/api/products", {
        params: { page, pageSize },
    })
    .then((response) => {
        const fetchedProducts: Product[] = response.data;
        setInitialProducts(fetchedProducts);
        setProducts(fetchedProducts);
        setLoadingProducts(false);
        calculateStatistics(fetchedProducts);
    })
    .catch((error) => {
        console.error("Error fetching products:", error);
        setLoadingProducts(false);
    });
  }, [page, pageSize]);


  const calculateStatistics = (productsToCalculate = products) => {
    let newProductsSet = new Set();
    let modifiedProductsSet = new Set();
    let outOfStockProductsSet = new Set();
    let availableProductsCount = 0;
    let unavailableProductsCount = 0;
    let priceIncreases = 0;
    let priceDecreases = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const uniqueProducts = new Map<string, Product>(); // Map pour stocker les produits uniques par référence
  
    // Ensemble pour stocker les références des produits déjà traités
    const processedProductRefs = new Set<string>();
  
    productsToCalculate.forEach((product) => {
      if (product.DateAjout && new Date(product.DateAjout).setHours(0, 0, 0, 0) === today) {
        newProductsSet.add(product.Ref);
      }
      if (product.Modifications && product.Modifications.some(mod => new Date(mod.dateModification).setHours(0, 0, 0, 0) === today)) {
        modifiedProductsSet.add(product.Ref);
      }
      if (product.Stock === "Hors stock") {
        outOfStockProductsSet.add(product.Ref);
      }
      if (product.Stock === "En stock") {
        availableProductsCount++;
      } else if (product.Stock === "Sur commande") {
        unavailableProductsCount++;
      }
      if (product.Modifications && product.Modifications.some(mod => {
        const modDate = new Date(mod.dateModification);
        return modDate.setHours(0, 0, 0, 0) === today;
      })) {
        modifiedProductsSet.add(product.Ref);
      }
  
      // Ajouter le produit à la Map en utilisant la référence comme clé
      if (!uniqueProducts.has(product.Ref)) {
        uniqueProducts.set(product.Ref, product);
      } else {
        // Si une version modifiée existe, la remplacer
        const existingProduct = uniqueProducts.get(product.Ref);
        if (existingProduct && existingProduct.Modifications) {
          const latestModification = product.Modifications && product.Modifications.length > 0 ? product.Modifications[product.Modifications.length - 1] : null;
          existingProduct.Modifications = latestModification ? [latestModification] : undefined;
        }
      }
      product.Modifications?.forEach((modification, index, modifications) => {
        const modDate = new Date(modification.dateModification).setHours(0, 0, 0, 0);
        if (modDate === today && !processedProductRefs.has(product.Ref)) {
          processedProductRefs.add(product.Ref); // Marquer le produit comme traité une fois
  
          const nextIndex = index + 1;
          let nextPrice = parseFloat(product.Price.replace(/[^\d.,]/g, "").replace(',', '.'));
          if (nextIndex < modifications.length) {
            nextPrice = parseFloat(modifications[nextIndex].ancienPrix.replace(/[^\d.,]/g, "").replace(',', '.'));
          }
  
          const currentPrice = parseFloat(modification.ancienPrix.replace(/[^\d.,]/g, "").replace(',', '.'));
          if (currentPrice > nextPrice) {
            priceDecreases++;
          } else if (currentPrice < nextPrice) {
            priceIncreases++;
          }
        }
      });
  
    });
  
    // Convertir les valeurs de la Map en tableau pour les statistiques
    const uniqueProductsArray = Array.from(uniqueProducts.values());
  
    // Calculer les statistiques avec les produits uniques
    setTotalProducts(uniqueProductsArray.length);
    setNewProductsCount(newProductsSet.size);
    setModifiedProductsCount(modifiedProductsSet.size);
    setDeletedProductsCount(outOfStockProductsSet.size);
    setAvailableProductsCount(availableProductsCount);
    setUnavailableProductsCount(unavailableProductsCount);
    setPriceIncreaseCount(priceIncreases);
    setPriceDecreaseCount(priceDecreases);
  };
  

  const extractCategories = (products: Product[]) => {
    const categories: { [key: string]: string[] } = {};
    products.forEach((product) => {
      if (!categories[product.Category]) {
        categories[product.Category] = [product.Subcategory];
      } else {
        if (!categories[product.Category].includes(product.Subcategory)) {
          categories[product.Category].push(product.Subcategory);
        }
      }
    });
    return categories;
  };
  const categories = useMemo(() => extractCategories(initialProducts), [
    initialProducts,
  ]);
  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      if (value === "") {
        setProducts(initialProducts);
        calculateStatistics(initialProducts);
      } else {
        const [selectedCategory, selectedSubcategory] = value.split("-");
        const filteredProducts = initialProducts.filter(
          (product) =>
            product.Category === selectedCategory &&
            product.Subcategory === selectedSubcategory
        );
        setProducts(filteredProducts);
        calculateStatistics(filteredProducts);  
      }
    },
    [initialProducts, calculateStatistics]  
  );
  const exportToXLS = useCallback(() => {
    const filteredProducts = initialProducts.filter(product => {
        const price = parseFloat(product.Price.replace(/\s/g, '').replace(',', '.'));
        const meetsPriceCriteria = (!minPrice || price >= parseFloat(minPrice)) && (!maxPrice || price <= parseFloat(maxPrice));
        const meetsStockCriteria = !availabilityFilter || 
          (availabilityFilter === "available" && product.Stock === "En stock") ||
          (availabilityFilter === "unavailable" && product.Stock === "Sur commande") ||
          (availabilityFilter === "horstock" && product.Stock === "Hors stock");
        const meetsCompanyCriteria = !selectedCompany || selectedCompany === "All" || product.Company === selectedCompany;
        const categoryFilterElement = document.getElementById("categoryFilter") as HTMLSelectElement;
        const selectedCategoryValue = categoryFilterElement ? categoryFilterElement.value : "";
        let meetsCategoryCriteria = true;
        if (selectedCategoryValue) {
          const [selectedCategory, selectedSubcategory] = selectedCategoryValue.split("-");
          meetsCategoryCriteria = product.Category === selectedCategory && product.Subcategory === selectedSubcategory;
        }
        return meetsPriceCriteria && meetsStockCriteria && meetsCompanyCriteria && meetsCategoryCriteria;
    });
    if (priceFilter === 'asc') {
        filteredProducts.sort((a, b) => parseFloat(a.Price.replace(/\s/g, '').replace(',', '.')) - parseFloat(b.Price.replace(/\s/g, '').replace(',', '.')));
    } else if (priceFilter === 'desc') {
        filteredProducts.sort((a, b) => parseFloat(b.Price.replace(/\s/g, '').replace(',', '.')) - parseFloat(a.Price.replace(/\s/g, '').replace(',', '.')));
    }
    const data = filteredProducts.map(product => {
        const latestModification = product.Modifications && product.Modifications.length > 0
            ? product.Modifications[product.Modifications.length - 1]
            : null;
        return {
            Ref: product.Ref,
            Designation: product.Designation,
            Price: product.Price,
            Stock: product.Stock,
            Image: product.Image,
            Brand: product.Brand,
            Company: product.Company,
            BrandImage: product.BrandImage,
            Link: product.Link,
            DateAjout: product.DateAjout ? new Date(product.DateAjout).toLocaleDateString() : " ",
            Category: product.Category,
            Subcategory: product.Subcategory,
            AncienPrix: latestModification ? latestModification.ancienPrix : " ",
            DateModification: latestModification ? new Date(latestModification.dateModification).toLocaleDateString() : " "
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    const today = new Date();
    const filename = `Products_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.xlsx`;
    XLSX.writeFile(wb, filename);
}, [initialProducts, minPrice, maxPrice, selectedCompany, availabilityFilter, priceFilter]);
const handleSearch = useCallback(
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setSearch(value);
    if (value === '') {
      setFetched(50);
      setProducts(initialProducts);
      calculateStatistics(initialProducts); // Recalculate stats based on all products
    } else {
      const filteredProducts = initialProducts.filter(
        (product: Product) =>
          product.Ref.toLowerCase().includes(value.toLowerCase()) ||
          product.Designation.toLowerCase().includes(value.toLowerCase()) ||
          product.Stock.toLowerCase().includes(value.toLowerCase()) ||
          product.Company.toLowerCase().includes(value.toLowerCase()) ||
          product.Brand.toLowerCase().includes(value.toLowerCase())
      );
      setProducts(filteredProducts);
      calculateStatistics(filteredProducts); // Recalculate stats based on filtered products
    }
  },
  [initialProducts, calculateStatistics]
);
const handleCompanyChange = useCallback(
  (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSelectedCompany(value === "All" ? null : value);
    const filteredProducts = value === "All"
      ? initialProducts
      : products.filter(product => product.Company === value);
    setProducts(filteredProducts);
    calculateStatistics(filteredProducts);
  },
  [products, initialProducts, calculateStatistics]
);
  
    const handleMinPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setMinPrice(value);
      const filteredProducts = filterProducts(value, maxPrice);
      setProducts(filteredProducts);
      calculateStatistics(filteredProducts);
    };
    
    const handleMaxPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setMaxPrice(value);
      const filteredProducts = filterProducts(minPrice, value);
      setProducts(filteredProducts);
      calculateStatistics(filteredProducts);
    };
    const filterProducts = (min: string, max: string): Product[] => {
      const minPriceValue = min ? parseFloat(min.replace(/\s/g, '').replace(',', '.')) : Number.MIN_VALUE;
      const maxPriceValue = max ? parseFloat(max.replace(/\s/g, '').replace(',', '.')) : Number.MAX_VALUE;
    
      return initialProducts.filter((product: Product) => {
        const price = parseFloat(product.Price.replace(/\s/g, '').replace(',', '.'));
    
        return price >= minPriceValue && price <= maxPriceValue;
      });
    };
    
  const handlePriceFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setPriceFilter(value === "asc" || value === "desc" ? value : null);
    },
    [initialProducts, calculateStatistics]
  );
  const handleAvailabilityFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setAvailabilityFilter(value);
      let filteredProducts = initialProducts; 
      if (value === "available") {
        filteredProducts = initialProducts.filter(product => product.Stock === "En stock");
      } else if (value === "unavailable") {
        filteredProducts = initialProducts.filter(product => product.Stock === "Sur commande");
      } else if (value === "horstock") {
        filteredProducts = initialProducts.filter(product => product.Stock === "Hors stock");
      }
      setProducts(filteredProducts); 
      calculateStatistics(filteredProducts);
    },
    [initialProducts,calculateStatistics]
  );
  const applyPriceFilter = (filteredProducts: Product[]) => {
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
    ? products.filter((product) => product.Company === selectedCompany)
    : products;
  const filteredProductsByPrice =
    minPrice !== "" && maxPrice !== ""
      ? filteredProductsByCompany.filter((product) => {
          const price = parseFloat(
            product.Price.replace(/\s/g, "").replace(",", ".")
          );
          const min = parseFloat(minPrice.replace(/\s/g, "").replace(",", "."));
          const max = parseFloat(maxPrice.replace(/\s/g, "").replace(",", "."));
          return price >= min && price <= max;
        })
      : filteredProductsByCompany;
      const filteredProductsByAvailability = availabilityFilter
      ? availabilityFilter === "available"
        ? products.filter(
            (product) => product.Stock === "En stock"
          )
        : availabilityFilter === "unavailable"
          ? products.filter(
              (product) => product.Stock === "Sur commande"
            )
          : availabilityFilter === "horstock"
            ? products.filter(
                (product) => product.Stock === "Hors stock"
              )
            : products  
       : products;
    const filteredProducts = applyPriceFilter(filteredProductsByAvailability);
  const __handleLoadMore = () => {
    if (products.length > fetched) {
      const newFetched = fetched + 50;
      setFetched(newFetched);
    }
  };
  const getPriceChanges = (products: Product[]) => {
    let priceIncreaseCount = 0;
    let priceDecreaseCount = 0;
    const today = new Date().setHours(0, 0, 0, 0);
  
    // Ensemble pour stocker les références des produits déjà traités
    const processedProductRefs = new Set<string>();
  
    products.forEach(product => {
      // Vérifier si le produit a été ajouté aujourd'hui
      if (product.DateAjout && new Date(product.DateAjout).setHours(0, 0, 0, 0) === today) {
        // Marquer le produit comme traité
        processedProductRefs.add(product.Ref);
      }
  
      // Vérifier les modifications de prix du produit
      if (product.Modifications && product.Modifications.length > 0) {
        let productProcessed = false; // Pour suivre si le produit a déjà été traité
        product.Modifications.forEach(modification => {
          const modDate = new Date(modification.dateModification).setHours(0, 0, 0, 0);
          if (modDate === today && !productProcessed) {
            productProcessed = true; // Marquer le produit comme traité une fois
            const oldPrice = parseFloat(modification.ancienPrix.replace(/\s/g, '').replace(',', '.'));
            const newPrice = parseFloat(product.Price.replace(/\s/g, '').replace(',', '.'));
            if (newPrice > oldPrice) {
              priceIncreaseCount++;
            } else if (newPrice < oldPrice) {
              priceDecreaseCount++;
            }
          }
        });
      }
    });
  
    return { priceIncreaseCount, priceDecreaseCount };
  };
  
  
  
   
 
  const resetFilters = useCallback(() => {
    setSearch("");
    setPage(1);
    setPageSize(50);
    setProducts(initialProducts);
    setPriceFilter(null);
    setMinPrice("");
    setMaxPrice("");
    setAvailabilityFilter(null);
    setSelectedCompany(null);
    const categoryFilterElement = document.getElementById("categoryFilter") as HTMLSelectElement;
    if (categoryFilterElement) {
      categoryFilterElement.selectedIndex = 0; 
    }
    fetchProducts();
  }, [initialProducts]);
  const handleResetFilters = () => {
    resetFilters();
  };
  return (
    <div
      className={`${styles.dashboard_content} products_page product-page-inputs`}
    >
      <div className={styles.dashboard_content_container}>
        <div className={styles.dashboard_content_header}>
          <Input
            type="text"
            value={search}
            label="Chercher.."
            onChange={(e) => handleSearch(e)}
          />
          <img src="/icons/search.gif" className={styles.search_icon} />
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
            title="Produits Hors Stock"
            link={ROUTES.DELETEDPRODUCTS}
            value={deletedProductsCount}
            icon="/images/suppression.png"
          />
             <DashboardComponents.StatCard
            title="Produits sur commandes"
            value={unavailableProductsCount}
            icon="/icons/product.svg"
          />  
        </div>
        <div className={styles.filter_container}>
          <div className={styles.filter_group}>       
            <select
              value={selectedCompany || "All"}
              onChange={handleCompanyChange}
            >
              <option value="All" style={{color:'gray'}}>Filtrer par concurrent </option>
              {companyOptions.map((company: string) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filter_group}>
          <select id="categoryFilter" onChange={handleCategoryChange}>
  <option value="" style={{color:'gray'}}>Filtrer par catégorie</option>
  {Object.keys(categories).map((category) => (
    <optgroup label={category} key={category}>
      {categories[category].map((subcategory) => (
        <option key={subcategory} value={`${category}-${subcategory}`}>
          {subcategory}
        </option>
      ))}
    </optgroup>
  ))}
</select>
          </div>
          <div className={styles.filter_group}>
            <input
              type="number"
              value={minPrice}
              placeholder="Prix min"
              onChange={handleMinPriceChange}
            />
          </div>
          <div className={styles.filter_group}>
            <input
              type="number"
              value={maxPrice}
              placeholder="Prix max"
              onChange={handleMaxPriceChange}
            />
          </div>
          <div className={styles.filter_group}>
            <select
              value={priceFilter || ""}
              onChange={handlePriceFilterChange}
            >
              <option value="" style={{ color: "gray" }}>Trier par prix...</option>
              <option value="asc"> Croissant</option>
              <option value="desc"> Décroissant</option>
            </select>
          </div>
          <div className={styles.filter_group}>       
            <select
              value={availabilityFilter || ""}
              onChange={handleAvailabilityFilterChange}
            >
              <option value="" style={{color:'gray'}}>Filtrer par disponibilité</option>
              <option value="available">En stock</option>
              <option value="horstock">Hors stock</option>
              <option value="unavailable">Sur commande</option>
            </select>
          </div>
          <button className={styles.reset_button} onClick={handleResetFilters}><b>X</b></button>
        </div>
        <div>
          <img
            src="/icons/lister.svg"
            alt="Tableau"
            onClick={() => setDisplayMode("table")}
            className={
              displayMode === "table" ? styles.selected_icon : styles.icon
            }
          />
          <img
            src="/icons/table-icon.svg"
            alt="Boîtes"
            onClick={() => setDisplayMode("box")}
            className={
              displayMode === "box" ? styles.selected_icon : styles.icon
            }
          />
        </div>
        <button onClick={exportToXLS} className={styles.exportButton}>
  Exporter en xls 
  <img
    src="/images/xls.png"
    alt="Exporter en XLS"
    className={styles.xls_image}
  />
  <img
    src="/images/telecharger.png"
    alt="Télécharger"
    className={styles.telecharger_image}
  />
</button>
        <tr></tr>
        {loadingProducts ? (
          <p style={{ textAlign: "center" }}>
            <b>Chargement...</b>
          </p>
        ) : products.length === 0 ? (
          <p style={{ textAlign: "center", color: "red" }}>
            <b>Aucun produit trouvé</b>
          </p>
        ) : displayMode === "table" ? (
          <table>
            <thead>
              <th>Image</th>
              <th>Référence</th>
              <th>Désignation</th>
              <th>Marque</th>
              <th>Disponibilité</th>
              <th>Ancien Prix</th>
              <th>Date </th>
              <th>Prix</th>
            </thead>
            {filteredProducts.length > 0 ? (
              <tbody>
                {filteredProducts
                  .slice(0, fetched)
                  .map((product: Product, index: number) => (
                    <tr key={index}>
                      <td>
                        {product.DateAjout && (
                          <>
                            {new Date(
                              product.DateAjout
                            ).toLocaleDateString() ===
                            new Date().toLocaleDateString() ? (
                              <img
                                src="/images/sign.png"
                                alt="New"
                                style={{
                                  width: "35px",
                                  height: "35px",
                                  position: "absolute",
                                  marginLeft: "-15px",
                                }}
                              />
                            ) : null}
                          </>
                        )}
                        {product.Modifications && (
                          <img
                            src="/images/updated-table.png"
                            alt="Modified"
                            style={{
                              width: "35px",
                              height: "35px",
                              position: "absolute",
                              marginLeft: "-15px",
                            }}
                          />
                        )}
                        {product.Stock === "Hors stock" && (
                          <img
                            src="/images/delete-image.png"
                            alt="Out of Stock"
                            style={{
                              width: "35px",
                              height: "35px",
                              position: "absolute",
                              marginLeft: "-15px",
                            }}
                          />
                        )}
                        <img src={product.Image} alt={product.Designation} />
                        <p>
                  {product.DiscountAmount !== "Aucune remise" && (
                    <div
                      className={styles.discount_rectangle}
                      style={{
                        backgroundColor: "red",
                        color: "white",
                        position: "absolute",
                        marginLeft: "-15px",
                        marginTop:"-80px",
                        borderRadius: "2px",
                      }}
                    >
                      <b>{product.DiscountAmount}</b>
                    </div>
                  )}
                </p>
                      </td>
                      <td>{product.Ref}</td>
                      <td>
                      <div className="product-details-link" key={product.Ref} onClick={() => handleProductClick(product)} style={{ cursor: 'pointer' }}>
  {product.Designation.length > 30
    ? product.Designation.slice(0, 30) + "..."
    : product.Designation}
</div>

                      </td>
                      <td>{product.Brand}</td>
                      <td>
                        <span
                          style={
                            product.Stock === "En stock"
                              ? { color: "green" }
                              : { color: "red" }
                          }
                        >
                          {product.Stock}
                        </span>
                      </td>
                      <td>
                      {product.Modifications && product.Modifications.length > 0
    ? product.Modifications[product.Modifications.length - 1].ancienPrix
    : '--'}
</td>
<td>
  {product.DateAjout && new Date(product.DateAjout).toLocaleDateString() === new Date().toLocaleDateString() ?
    new Date(product.DateAjout).toLocaleDateString() :
    (product.Modifications && product.Modifications.length > 0 ?
      new Date(product.Modifications[product.Modifications.length - 1].dateModification).toLocaleDateString() :
      (product.DateAjout ?
        new Date(product.DateAjout).toLocaleDateString() :
        "No date available"))
  }
</td>
                      <td>{product.Price}</td>
                    </tr>
                  ))}
              </tbody>
            ) : null}
          </table>
        ) : (
          <div className={styles.dashboard_content_cards}>
            {filteredProducts.map((product: Product, index: number) => (
              <div key={index} className={styles.product_box}>
              {product.Stock === "Sur commande" && (
                <img
                  className={styles.sold_out_overlay}
                  src="/images/pre-order.png"
                  alt="Sold Out"
                  style={{
                    position: "absolute",
                    top: "-60px",
                    left: "-30px",
                  }}
                />
              )}
             {product.DateAjout && new Date(product.DateAjout).toLocaleDateString() === new Date().toLocaleDateString() && (
      <img
        className={styles.new_product_overlay}
        src="/images/new.png"
        alt="New Product"
      />
    )}
{product.Modifications && product.Modifications.length > 0 && (
  <img
    className={styles.update_product_overlay}
    src="/images/upp.png"
    style={{
      width: "150px",
      height: "120px",
      position: "absolute",
    }}
    alt="Updated Product"
  />
)}
              {product.Stock ==  "Hors stock" && (
                <img
                  className={styles.new_product_overlay}
                  src="/images/out-of-stock.png"
                  alt="New Product"
                />
              )}
              <img src={product.Image} alt={product.Designation} />
              <div>
                <p>
                  {product.DiscountAmount !== "Aucune remise" && (
                    <div
                      className={styles.discount_rectangle}
                      style={{
                        backgroundColor: "red",
                        color: "white",
                        position: "absolute",
                        top: "1.60px",
                        left: "5px",
                        padding: "5px",
                        borderRadius: "5px",
                      }}
                    >
                      <b>{product.DiscountAmount}</b>
                    </div>
                  )}
                </p>
                <p> {product.Ref}</p>
                <h3>
                  <a  href={product.Link} target="_blank"  style={{ color: "#140863" }}
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
                {product.Modifications && (
                  <div>
                   <p><span style={{ textDecoration: 'line-through',color:'gray'}}>{product.Modifications && product.Modifications.length > 0
    ? product.Modifications[product.Modifications.length - 1].ancienPrix
    : 'Pas de modifications'}</span></p>
                    <p>
                      {" "}
                      <span style={{ color: "red" }}>
                        <b>{product.Price}</b>
                      </span>
                    </p>
                  </div>
                )}
                {!product.Modifications && (
                  <p style={{ color: "red" }}> {product.Price}</p>
                )}
                <p>{product.Company}</p>
                <Link
  className="product-details-link"
  to={`${ROUTES.PRODUCTDETAILS}/${product.Ref}`}
>Voir plus</Link>
              </div>
            </div>
            ))}
          </div>
        )}
        {products.length > fetched ? (
          <span
            className={styles.handle_more_button}
            onClick={__handleLoadMore}
          >
            Charger plus
          </span>
        ) : null}
        <div className={styles.notification_bell}>
        <img
    src="/icons/notification-bell.gif"
    alt="Notification Bell"
    onClick={toggleDialog}
  />
  {(newProductsCount > 0 || modifiedProductsCount > 0) && (
    <span className={styles.notification_counter}>
  <b>{newProductsCount + modifiedProductsCount}</b>
    </span>
  )}
 {selectedProduct && (
  <ProductDetails
    product={selectedProduct}
    onClose={() => setSelectedProduct(null)}
  />
)}

{dialogOpen && (
  <div className={styles.dialog}>
    <DialogContent />
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default Products;