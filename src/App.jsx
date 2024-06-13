import { useState } from "react";
import PharmaciesProximite from "./components/PharmaciesProximite.jsx";

const App = () => {
  const [clicked, setClicked] = useState(false);

  return (
    <div>
      <button onClick={() => setClicked(true)}>Rechercher un emplacement</button>
      {clicked && <PharmaciesProximite />}
    </div>
  );
};

export default App;
