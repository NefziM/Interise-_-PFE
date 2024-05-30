import React, { useState, FormEvent } from "react";
import axios from 'axios';
import { Input } from "@components";
import styles from "./login.module.css";
import { useNavigate, Link } from "react-router-dom";
import { ROUTES } from "@utils";
import { FaEnvelope, FaLock } from 'react-icons/fa';

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email: username,
        motDePasse: password
      });
      if (response.data) {
        navigate(ROUTES.DASHBOARD);
      } else {
        showDialog("Invalid username or password");
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        showDialog(err.response.data.message || "Email et/ou Mot de passe incorrects !");
      } else {
        showDialog("Email et/ou Mot de passe incorrects !");
      }
    }
  };

  const showDialog = (errorMessage: string) => {
    setError(errorMessage);
    setDialogVisible(true);
  };

  const isInputValid = () => {
    return username.trim() !== "" && password.trim() !== "";
  };



    return (
      <div className={`${styles.login_container} login-page-inputs`}>
        <img src="/images/logoo.png" className={styles.logo} alt="Logo" />
        <div className={styles.login_form}>
          <h1>Connexion</h1>
          <form onSubmit={handleSubmit}>
            <div className={styles.input_container}>
              <FaEnvelope className={styles.icon} />
              <Input
                type="text"
                label="Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className={styles.input_container}>
              <FaLock className={styles.icon} />
              <Input
                type="password"
                label="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className={isInputValid() ? styles.enabled_button : styles.disabled_button} 
              disabled={!isInputValid()}
            >
              Se connecter
            </button>
          </form>
        </div>
        {dialogVisible && (
          <div className={styles.dialog_overlay} onClick={() => setDialogVisible(false)}>
            <div className={styles.dialog}>
              <span className={styles.close_button} onClick={() => setDialogVisible(false)}><b>×</b></span>
              <p className={styles.error_message}>{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  };