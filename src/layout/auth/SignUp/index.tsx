import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaPhone, FaLock, FaHome } from 'react-icons/fa';
import { Link } from 'react-router-dom'; // Assurez-vous que react-router-dom est installé
import "./SignUp.css";
import { ROUTES } from "@utils"; // Assurez-vous que ce chemin est correct

interface FormState {
    nom: string;
    prenom: string;
    email: string;
    adresse: string;
    Tel: string;
    motDePasse: string;
    verificationMotDePasse: string;
}

const SignUp: React.FC = () => {
    const [formData, setFormData] = useState<FormState>({
        nom: '',
        prenom: '',
        email: '',
        adresse: '',
        Tel: '',
        motDePasse: '',
        verificationMotDePasse: ''
    });
    const [isFormValid, setIsFormValid] = useState<boolean>(false);

    useEffect(() => {
        const isValid =
            formData.motDePasse === formData.verificationMotDePasse &&
            formData.motDePasse.length > 0 &&
            formData.email.includes('@') &&
            formData.Tel.length === 8;
        setIsFormValid(isValid);
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isFormValid) {
            try {
                const response = await fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });
                if (response.ok) {
                    console.log('Inscription réussie !');
                } else {
                    console.error('Erreur lors de l\'inscription :', await response.text());
                }
            } catch (error) {
                console.error('Erreur lors de l\'inscription :', error);
            }
        } else {
            console.error('Le formulaire est invalide');
        }
    };

    return (
        <body>
        <Link to={ROUTES.LOGIN}><FaHome className="home-icon" /></Link>

        <form className="sign-up-form" onSubmit={handleSubmit}>
                        <div className="header">
                        
                        <div className="title">Inscription</div>

                
            </div>
            <div className="input-container">
                <FaUser className="icon" />
                <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Nom"
                    required
                />
            </div>
            <div className="input-container">
                <FaUser className="icon" />
                <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Prénom"
                    required
                />
            </div>
            <div className="input-container">
                <FaEnvelope className="icon" />
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Adresse mail"
                    required
                />
            </div>
            <div className="input-container">
                <FaMapMarkerAlt className="icon" />
                <input
                    type="text"
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    placeholder="Adresse"
                    required
                />
            </div>
            <div className="input-container">
                <FaPhone className="icon" />
                <input
                    type="text"
                    name="Tel"
                    value={formData.Tel}
                    onChange={handleChange}
                    placeholder="Numéro de téléphone"
                    required
                />
            </div>
            <div className="input-container">
                <FaLock className="icon" />
                <input
                    type="password"
                    name="motDePasse"
                    value={formData.motDePasse}
                    onChange={handleChange}
                    placeholder="Mot de Passe"
                    required
                />
            </div>
            <div className="input-container">
                <FaLock className="icon" />
                <input
                    type="password"
                    name="verificationMotDePasse"
                    value={formData.verificationMotDePasse}
                    onChange={handleChange}
                    placeholder="Vérification du mot de passe"
                    required
                />
            </div>
            <button type="submit" disabled={!isFormValid}>S'inscrire</button>
        </form>
        </body>
    );
};

export default SignUp;
