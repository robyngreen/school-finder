'use strict';

import React from 'react';
import Filter from "../components/Filter";
import GoogleMap from 'google-map-react';
import fetch from 'isomorphic-fetch';
import polyfill from 'es6-promise';
polyfill.polyfill();

let levels = [{
    'min': 1,
    'max': 25,
    'color': 'green'
  },
  {
    'min': 26,
    'max': 75,
    'color': 'blue'
  },
  {
    'min': 76,
    'max': 125,
    'color': 'yellow'
  },
  {
    'min': 126,
    'max': 9999,
    'color': 'red'
}];

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

    //events.subscribe('clicked-button', this.toogleVisibility)
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
      for (let i = 0; i < levels.length; i++) {
        if (marker.num_students >= levels[i].min && marker.num_students <= levels[i].max) {
          circle.fillColor = levels[i].color;
          break;
        }
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
            {
              levels.map(function(level, index) {
                let text = `${level.max} students or less`;
                if (index === levels.length - 1) {
                  text = `More than ${level.min} students`;
                }
                return <li className={ level.color }>{ text }</li>;
              })
            }
          </ul>
        </div>
        <Filter schools={this.state.schools} />
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
