import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix pour les icônes de marqueur manquantes avec Webpack
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Icônes personnalisées
const currentLocationIcon = L.icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const nearestPharmacyIcon = L.icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Définition de l'icône par défaut
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 40],
});

var city, country = null;

L.Marker.prototype.options.icon = defaultIcon;

const PharmaciesProximite = () => {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const nearestPharmacyIndexRef = useRef(null); // Déclarer nearestPharmacyIndex en tant que référence
  

  useEffect(() => {
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Rayon de la Terre en km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance en km
      return distance;
    };

    const getIP = async () => {
      try {
        const response = await axios.get("https://api.ipify.org?format=json");
        console.log("Adresse IP:", response.data.ip);
        const localisation = await axios.get("http://ip-api.com/json/" + response.data.ip);
        city = localisation.data.city;
        country = localisation.data.country;
        console.log(localisation, city, country);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'adresse IP:", error);
        setError("Erreur lors de la récupération de l'adresse IP");
      }
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log(position, position.coords.latitude, position.coords.longitude);
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoading(false);
            getPharmacies(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            setLoading(false);
            setError("Erreur lors de la récupération de la géolocalisation");
          }
        );
      } else {
        setError(
          "La géolocalisation n'est pas prise en charge par ce navigateur."
        );
      }
    };

    const getPharmacies = async (latitude, longitude) => {
      const radius = 1500; // en mètres
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:${radius},${latitude},${longitude})[amenity=pharmacy];out;`;

      try {
        setLoadingPharmacies(true);
        const response = await axios.get(overpassUrl);
        console.log("overpass-api : ", response);
        const pharmaciesData = response.data.elements.map((pharmacy) => ({
          id: pharmacy.id,
          lat: pharmacy.lat,
          lon: pharmacy.lon,
          name: pharmacy.tags.name || "Pharmacie",
        }));

        // Trouver la pharmacie la plus proche
        let minDistance = Infinity;

        pharmaciesData.forEach((pharmacy, index) => {
          const distance = calculateDistance(
            latitude,
            longitude,
            pharmacy.lat,
            pharmacy.lon
          );
          pharmacy.dist = distance;
          console.log(pharmacy);
          if (distance < minDistance) {
            minDistance = distance;
            nearestPharmacyIndexRef.current = index; // Assigner la valeur à la référence
          }
        });

        setPharmacies(pharmaciesData);
        setLoadingPharmacies(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des pharmacies:", error);
        setLoadingPharmacies(false);
        setError("Erreur lors de la récupération des pharmacies");
      }
    };

    getIP();
    getLocation();
  }, []);

  return (
    <div>
      <h1>Pharmacies à Proximité</h1>
      {error && <p style={{ color: "red" }}>Erreur: {error}</p>}
      {loading ? (
        <p>Obtention de la position...</p>
      ) : (
        <>
          <div style={{ width: "100%", height: "400px" }}>
            {location.latitude && location.longitude ? (
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker
                  position={[location.latitude, location.longitude]}
                  icon={currentLocationIcon}
                >
                  <Popup>Vous êtes ici</Popup>
                </Marker>
                {pharmacies.map((pharmacy, index) => (
                  <Marker
                    key={pharmacy.id}
                    position={[pharmacy.lat, pharmacy.lon]}
                    icon={
                      index === nearestPharmacyIndexRef.current
                        ? nearestPharmacyIcon
                        : defaultIcon
                    }
                  >
                    <Popup>
                      <img src="../images/pharma1.webp" alt="photo pharmacie" />
                      {pharmacy.name}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <p>Impossible d&apos;obtenir la position</p>
            )}
          </div>
          {loadingPharmacies ? (
            <p>Chargement des pharmacies...</p>
          ) : (
            <ul>
              {pharmacies.map(
                (pharmacy) =>
                  pharmacy.name != "Pharmacie" && (
                    <li key={pharmacy.id}>
                      <strong>{pharmacy.name}</strong> - {city}, {country}{" "}
                      <b>&#40;{pharmacy.dist} km.&#41;</b>
                    </li>
                  )
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default PharmaciesProximite;
