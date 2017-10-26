'use strict';

import React from 'react';
import { compose, withProps, withStateHandlers } from "recompose";
import { withScriptjs, withGoogleMap, GoogleMap, Marker, InfoWindow } from 'react-google-maps';
import MarkerClusterer from "react-google-maps/lib/components/addons/MarkerClusterer";
import fetch from 'isomorphic-fetch';
import polyfill from 'es6-promise';
polyfill.polyfill();

export default class SchoolMap extends React.Component {

  constructor () {
    super();

    this.state = {
      key: 'AIzaSyBRkuCulzUl4pK6YvNR_xvOi55SliwwCsI',
      center: {
        lat: 39,
        lng: -95
      },
      zoom: 3
    };
  }

  /**
   * Called whenever the component is mounted.
   */
  componentDidMount() {
    var self = this;
    fetch('http://localhost:3000/api/v1/school')
      .then(function(data) {
        data.json()
          .then(function(jsonData) {
            self.setState({schools: jsonData});
          });
      });
  }

  render() {
    const MyMapComponent = compose(
      withProps({
        googleMapURL: "https://maps.googleapis.com/maps/api/js?v=3&key=" + this.state.key + "&libraries=geometry,drawing,places",
        loadingElement: <div style={{ height: `100%` }} />,
        containerElement: <div style={{ height: `400px` }} />,
        mapElement: <div style={{ height: `100%` }} />,
      }),
      withScriptjs,
      withGoogleMap,
      withStateHandlers(() => ({
        isOpen: false,
      }), {
        onToggleOpen: ({ isOpen }) => () => ({
          isOpen: !isOpen,
        })
      }),
    )((props) =>
      <GoogleMap
        defaultZoom={this.state.zoom}
        defaultCenter={this.state.center}
      >
        <MarkerClusterer
          averageCenter
          enableRetinaIcons
          gridSize={20}
        >
          {props.markers.map(marker => (
            <Marker
              key={marker.id}
              position={{ lat: marker.latitude, lng: marker.longitude }}
              onClick={props.onToggleOpen}
            >
              {props.isOpen && <InfoWindow onCloseClick={props.onToggleOpen}>
               <div>
                 <div>{marker.name}</div>
                 <div>Number of Students: {marker.num_students}</div>
                 <div>Max Age: {marker.endage}</div>
              </div>
              </InfoWindow>}
            </Marker>
          ))}
        </MarkerClusterer>
      </GoogleMap>
    );

    return (
      <div className="map">
        <div className="mapContainer">
          <MyMapComponent markers={this.state.schools} />
        </div>
        <style jsx>{`
          .map {
            width: 88%;
            height: 300px;
            margin: 2em auto;
          }
          .mapContainer {
            width: 100%;
            height: 100%;
          }
        `}</style>
      </div>
    );
  }
}
