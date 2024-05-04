import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./styles.css";
import { ROUTES } from "@utils";

export const SideBar = () => {
  const [isOpen, setIsOpen] = useState(true);  
  const toggleSidebar = () => setIsOpen(!isOpen); 
  const path = useLocation().pathname;

  return (
    <div className="sidebar" style={{ width: isOpen ? '220px' : '60px' }}>
      <img
        src="/images/menu.png"
        alt="Toggle Sidebar"
        className="sidebar-toggle-icon"
        onClick={toggleSidebar}
      />
      <div className="sidebar-container">
      <div className="sidebar-logo-container">
      {isOpen &&  <img src="/images/logo.webp" alt="logo" />}
        </div>

        <div className="sidebar-items">
          <Link to={ROUTES.DASHBOARD} className={path === ROUTES.DASHBOARD ? "sidebar-item-active" : "sidebar-item"}>
            <img src="/icons/dashboard.svg" alt="Dashboard" className="sidebar-item-icon" />
            {isOpen && <span className="sidebar-item-label">Tableau de board</span>}
          </Link>
          <Link to={ROUTES.PRODUCTS} className={path === ROUTES.PRODUCTS ? "sidebar-item-active" : "sidebar-item"}>
            <img src="/icons/product.svg" alt="Products" className="sidebar-item-icon" />
            {isOpen && <span className="sidebar-item-label">Tous les produits</span>}
          </Link>
          <Link to={ROUTES.NEWPRODUCTS} className={path === ROUTES.NEWPRODUCTS ? "sidebar-item-active" : "sidebar-item"}>
            <img src="/icons/new.svg" alt="New Products" className="sidebar-item-icon" />
            {isOpen && <span className="sidebar-item-label">Nouveaux produits</span>}
          </Link>
          <Link to={ROUTES.UPDATE} className={path === ROUTES.UPDATE ? "sidebar-item-active" : "sidebar-item"}>
            <img src="/icons/update.svg" alt="Updated Products" className="sidebar-item-icon" />
            {isOpen && <span className="sidebar-item-label">Produits Modifiés</span>}
          </Link>
        </div>
       
        <Link className="sidebar-footer" to={ROUTES.LOGIN}>
        
          {isOpen && <span className="sidebar-item-label">Se déconnecter</span>}
          <img src="/icons/logout.svg" alt="Logout" className="sidebar-item-icon" />
        </Link>
      </div>
    </div>
  );
};
