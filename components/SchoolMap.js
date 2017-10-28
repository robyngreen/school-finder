'use strict';

import React from 'react';
import GoogleMap from 'google-map-react';
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
      zoom: 3,
      schools: null
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

  renderMarkers(map, maps) {
    let circle = {
        path: maps.SymbolPath.CIRCLE,
        fillColor: 'red',
        fillOpacity: .5,
        scale: 3.25,
        strokeColor: 'white',
        strokeWeight: .75
    };
    this.state.schools.map(marker => {
      // Change the color depending upon school size.
      circle.fillColor = 'red';
      if (marker.num_students < 25) {
        circle.fillColor = 'green';
      }
      else if (marker.num_students < 75) {
        circle.fillColor = 'blue';
      }
      else if (marker.num_students < 125) {
        circle.fillColor = 'yellow';
      }
      // Setup the info window.
      let ContentString = '<div>' + marker.name + '</div><div>Number of Students: ' + marker.num_students + '</div><div>Max Age: ' + marker.endage + '</div>';
      let InfoWindow = new google.maps.InfoWindow({
        content: ContentString
      });
      let SchoolMarker = new maps.Marker({
        position: {
          lat: marker.latitude,
          lng: marker.longitude
        },
        map,
        title: marker.name,
        icon: circle
      });
      SchoolMarker.addListener('click', function() {
        InfoWindow.open(map, SchoolMarker);
      });
    });
  }

  render() {
    if (this.state.schools === null) {
      // @todo: loading here
      return '';
    }
    return (
      <div className="map">
        <div className="mapContainer">
          <GoogleMap
            bootstrapURLKeys={{ key: this.state.key }}
            className="map"
            center={this.state.center}
            defaultZoom={this.state.zoom}
            onGoogleApiLoaded={({map, maps}) => this.renderMarkers(map, maps)}
            yesIWantToUseGoogleMapApiInternals
          >
          </GoogleMap>
        </div>
        <div className="legend">
          <ul>
            <li className="green">25 students or less</li>
            <li className="blue">75 students or less</li>
            <li className="yellow">125 students or less</li>
            <li className="red">More than 125 students</li>
          </ul>
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
            border: 1px solid black;
          }

          .legend {

          }

          .legend ul {
            display: flex;
            flex-flow: row wrap;
          }

          .legend li {
            flex: 0 0 50%;
            position: relative;
            list-style: none;
          }

          .legend li:before {
            display: block;
            width: 7px;
            height: 7px;
            content: ' ';
            position: absolute;
            top: 35%;
            left: -15px;
            border-radius: 7px;
          }

          .legend .red {

          }

          .legend .red:before {
            background: red;
          }

          .legend .blue {

          }

          .legend .blue:before {
            background: blue;
          }

          .legend .yellow {

          }

          .legend .yellow:before {
            background: yellow;
          }

          .legend .green {

          }

          .legend .green:before {
            background: green;
          }

        `}</style>
      </div>
    );
  }
}
