import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import * as tt from "@tomtom-international/web-sdk-maps";
import "./App.scss";

const API_KEY = import.meta.env.VITE_TOMOTOM_API_KEY;

function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<tt.Map | null>(null);
  const [longitude, setLongitude] = useState<number>(-0.112869);
  const [latitude, setLatitude] = useState<number>(51.504);

  const handleUserInput = (
    e: ChangeEvent<HTMLInputElement>,
    setAction: Dispatch<SetStateAction<number>>
  ) => {
    const userInput = +e.target.value;
    if (isNaN(userInput) || userInput < -90 || userInput > 90) return;
    setAction(userInput);
  };

  useEffect(() => {
    let mapObject: tt.Map;
    if (mapRef.current) {
      const mapOptions = {
        key: API_KEY,
        container: mapRef.current,
        zoom: 14,
        center: [longitude, latitude] as [number, number],
        stylesVisibility: {
          trafficIncidents: true,
          trafficFlow: true,
        },
      };
      mapObject = tt.map(mapOptions);
      setMap(mapObject);
    }

    return () => {
      setMap(null);
      mapObject.remove();
    };
  }, [longitude, latitude]);

  return (
    <div className="App">
      <div className="map" ref={mapRef} />
      <div className="searchbar">
        <h1>Where to?</h1>
        <label htmlFor="latitude">Latitude:</label>
        <input
          value={latitude}
          type="text"
          id="latitude"
          className="latitude"
          placeholder="Latitude..."
          onChange={(e) => {
            handleUserInput(e, setLatitude);
          }}
        />
        <label htmlFor="longitude">Longitude:</label>

        <input
          value={longitude}
          type="text"
          id="longitude"
          className="longitude"
          placeholder="Longitude..."
          onChange={(e) => {
            handleUserInput(e, setLongitude);
          }}
        />
      </div>
    </div>
  );
}

export default App;
