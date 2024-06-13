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

const nearestLocationIcon = L.icon({
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

L.Marker.prototype.options.icon = defaultIcon;

const PharmaciesProximite = () => {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const nearestLocationIndexRef = useRef(null);

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

    const getLocation = () => {
      if (navigator.geolocation) {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoading(false);
            getLocations(position.coords.latitude, position.coords.longitude);
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

    const getLocations = async (latitude, longitude) => {
      try {
        setLoadingLocations(true);
        const response = await axios.get("/api/locations");                                         // Remplace par l'URL de ton serveur JSON
        const locationsData = response.data.map((location) => ({
          id: location.id,
          lat: location.latitude,
          lon: location.longitude,
          name: location.name,
          address: location.address,
        }));

        let minDistance = Infinity;

        locationsData.forEach((location, index) => {
          const distance = calculateDistance(
            latitude,
            longitude,
            location.lat,
            location.lon
          );
          location.dist = distance;
          if (distance < minDistance) {
            minDistance = distance;
            nearestLocationIndexRef.current = index;
          }
        });

        setLocations(locationsData);
        setLoadingLocations(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des lieux:", error);
        setLoadingLocations(false);
        setError("Erreur lors de la récupération des lieux");
      }
    };

    getLocation();
  }, []);

  return (
    <div>
      <h1>Lieux à Proximité</h1>
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
                {locations.map((location, index) => (
                  <Marker
                    key={location.id}
                    position={[location.lat, location.lon]}
                    icon={
                      index === nearestLocationIndexRef.current
                        ? nearestLocationIcon
                        : defaultIcon
                    }
                  >
                    <Popup>
                      <strong>{location.name}</strong>
                      <br />
                      {location.address}
                      <br />
                      <b>Distance: {location.dist.toFixed(2)} km</b>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <p>Impossible d&apos;obtenir la position</p>
            )}
          </div>
          {loadingLocations ? (
            <p>Chargement des lieux...</p>
          ) : (
            <ul>
              {locations.map((location) => (
                <li key={location.id}>
                  <strong>{location.name}</strong> - {location.address}{" "}
                  <b>&#40; à {location.dist.toFixed(2)} km&#41;</b>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default PharmaciesProximite;
