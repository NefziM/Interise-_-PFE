import React, { useState, FormEvent } from "react";
import axios from 'axios';
import { Input } from "@components"; // Assurez-vous que ce chemin est correct
import styles from "./login.module.css";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@utils"; // Assurez-vous que ce chemin est correct

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);  // Contrôler l'état du bouton

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email: username,
        motDePasse: password
      });
      if (response.data) {
        setEnabled(true); // Active le bouton si les identifiants sont corrects
        navigate(ROUTES.DASHBOARD);
      } else {
        setEnabled(false); // Désactive le bouton si les identifiants sont incorrects
        setError("Invalid username or password");
      }
    } catch (err: any) {
      setEnabled(false); // Assurez-vous de désactiver le bouton en cas d'erreur
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || "An unexpected error occurred");
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div className={`${styles.login_container} login-page-inputs`}>
      <div className={styles.login_form}>
        <h1>Connexion</h1>
        <form onSubmit={handleSubmit}>
          <Input
            type="text"
            label="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            type="password"
            label="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className={enabled ? styles.blue_button : styles.disabled_button}>
            Se connecter
          </button>
          {error && <p className={styles.error_message}>{error}</p>}
        </form>
      </div>
    </div>
  );
};

// Ajoutez les styles correspondants dans votre CSS pour `blue_button` et `disabled_button`
