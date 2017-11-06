'use strict';

import React from 'react';

export default class Filter extends React.Component {
  constructor () {
    super();
  }

  /**
   * Called whenever the component is mounted.
   */
  componentDidMount() {
    var self = this;
    fetch('http://localhost:3000/api/v1/state')
      .then(function(data) {
        data.json()
          .then(function(jsonData) {
            self.setState({states: jsonData});
          });
      });
  }

  render() {
    // this.props.schools
    return (
      <div className="filter">
        <div className="filter-container">
        </div>

        <style jsx>{`
          .filter {
          }

        `}</style>
      </div>
    );
  }
}
