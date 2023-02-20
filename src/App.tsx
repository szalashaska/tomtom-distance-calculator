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
import * as ttAPi from "@tomtom-international/web-sdk-services";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import "./App.scss";

type ApiResponseType = {
  response: {
    routeSummary: {
      travelTimeInSeconds: number;
    };
  };
};

type ResultsType = {
  location: tt.LngLat;
  drivingtime: number;
};

// location: destinationRef.current[idx],
// drivingtime: item.response.routeSummary.travelTimeInSeconds,

const API_KEY = import.meta.env.VITE_TOMOTOM_API_KEY;

function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<tt.Map | null>(null);
  const [longitude, setLongitude] = useState<number>(-0.112869);
  const [latitude, setLatitude] = useState<number>(51.504);
  const [latitudeInput, setLatitudeInput] = useState<number>(51.504);
  const [longitudeInput, setLongitudeInput] = useState<number>(-0.112869);
  const destinationRef = useRef<tt.LngLat[]>([]);

  const handleUserInput: (
    e: ChangeEvent<HTMLInputElement>,
    setAction: Dispatch<SetStateAction<number>>
  ) => void = (e, setAction) => {
    const userInput = +e.target.value;
    if (userInput < -90 || userInput > 90) return;
    setAction(userInput);
  };

  const handleSubmit: (e: FormEvent<HTMLFormElement>) => void = (e) => {
    e.preventDefault();
    if (!isNaN(longitudeInput)) setLongitude(latitudeInput);
    if (!isNaN(latitudeInput)) setLatitude(latitudeInput);
  };

  const createPopup: () => tt.Popup = () => {
    const popupOffset: { bottom: [number, number] } = {
      bottom: [0, -45],
    };
    const popup = new tt.Popup({
      offset: popupOffset,
    }).setHTML("This is you!");
    return popup;
  };

  const addMarker: (map: tt.Map) => void = (map) => {
    if (!map) return;
    const element = document.createElement("div");
    element.className = "driver-marker";
    const marker = new tt.Marker({
      draggable: true,
      element,
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    const popup = createPopup();

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      setLatitude(lngLat.lat);
      setLongitude(lngLat.lng);
    });

    marker.setPopup(popup).togglePopup();
  };

  const convertToPoints: (lngLat: tt.LngLat) => {
    point: {
      latitude: number;
      longitude: number;
    };
  } = (lngLat) => {
    // const point = {
    //   latitude: lngLat.lat,
    //   longitude: lngLat.lng,
    // };
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      },
    };
  };

  const addDeliveryMarker: (lngLat: tt.LngLat, map: tt.Map) => void = (
    lngLat,
    map
  ) => {
    const element = document.createElement("div");
    element.className = "delivery-marker";
    new tt.Marker({ element }).setLngLat(lngLat).addTo(map);
  };

  const convertArray = (destinations: tt.LngLat[]) => {
    return destinations.map((item) => convertToPoints(item));
  };

  const sortDestenations: (
    destinations: tt.LngLat[]
  ) => Promise<tt.LngLat[]> = (destinations) => {
    const origin = {
      lng: longitude,
      lat: latitude,
    };

    const callParams: ttAPi.MatrixRoutingOptions = {
      key: API_KEY,
      destinations: convertArray(destinations),
      origins: [convertToPoints(origin as tt.LngLat)],
    };

    return new Promise((resolve, reject) => {
      ttAPi.services.matrixRouting(callParams).then((matrixApiResults) => {
        const results = matrixApiResults.matrix[0] as ApiResponseType[];
        const resultsArray: ResultsType[] = results.map((item, idx) => ({
          location: destinations[idx],
          drivingtime: item.response.routeSummary.travelTimeInSeconds,
        }));
        const sortedLocation = resultsArray
          .sort((a, b) => a.drivingtime - b.drivingtime)
          .map((item) => item.location);

        resolve(sortedLocation);
      });
    });
  };

  const drawRoute = (geoJson: tt.GeoJSONFeature, map: tt.Map) => {
    if (map.getLayer("route")) {
      map.removeLayer("route");
      map.removeSource("route");
    }
    map.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: geoJson,
      },
      paint: {
        "line-color": "red",
        "line-width": 6,
      },
    });
  };

  const recalculateToutes = (map: tt.Map) => {
    sortDestenations(destinationRef.current).then((sorted) => {
      sorted.unshift({ lng: longitude, lat: latitude } as tt.LngLat);

      ttAPi.services
        .calculateRoute({ key: API_KEY, locations: sorted })
        .then((routeData) => {
          const geoJson = routeData.toGeoJson() as unknown;
          drawRoute(geoJson as tt.GeoJSONFeature, map);
        });
    });
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
      addMarker(mapObject);

      mapObject.on("click", (e: tt.MapMouseEvent<"click">) => {
        if (destinationRef.current) {
          destinationRef.current.push(e.lngLat);
          addDeliveryMarker(e.lngLat, mapObject);
          recalculateToutes(mapObject);
        }
      });
      setMap(mapObject);
    }
    return () => {
      if (mapObject) mapObject.remove();
    };
  }, [longitude, latitude]);

  return (
    <>
      <div className="app">
        <div className="map" ref={mapRef} />
        <div className="searchbar">
          <h1>Where to?</h1>
          <form onSubmit={handleSubmit}>
            <label htmlFor="latitude">Latitude:</label>
            <input
              value={latitudeInput}
              type="number"
              id="latitude"
              className="latitude"
              placeholder="Latitude..."
              onChange={(e) => {
                handleUserInput(e, setLatitudeInput);
              }}
            />
            <label htmlFor="longitude">Longitude:</label>
            <input
              value={longitudeInput}
              type="number"
              id="longitude"
              className="longitude"
              placeholder="Longitude..."
              onChange={(e) => {
                handleUserInput(e, setLongitudeInput);
              }}
            />
            <button type="submit">Submit</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
