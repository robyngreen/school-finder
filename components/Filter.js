'use strict';

import React from 'react';
import Select from 'react-select';
import selectCSS from 'react-select/dist/react-select.css';

export default class Filter extends React.Component {
  constructor () {
    super();

    // Set defaults.
    this.state = {
      states: []
    };
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
            let stateValues = [];
            let item;
            for (item in jsonData) {
              stateValues.push({
                value: jsonData[item].id,
                label: jsonData[item].name
              });
            }
            //self.setState({states: jsonData});
            self.setState({states: stateValues});
          });
      });
  }

  render() {
    // Catch for not rendering too early.
    if (this.state.states === null) {
      // @todo: loading here
      return '';
    }

    // this.props.schools
    return (
      <div className="filter">
        <div className="filter-container">
          <Select
            name="form-field-states"
            value="State"
            options={this.state.states}
          />
        </div>

        <style global jsx>
          { selectCSS }
        </style>
        <style jsx>
          {`
            .filter {

            }
          `}
        </style>
      </div>
    );
  }
}
