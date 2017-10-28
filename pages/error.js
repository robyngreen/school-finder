import React from 'react'

export default class extends React.Component {
  static getInitialProps (props) {
    return { error: props.query }
  }

  render () {
    return {{ this.props.error }}
  }
}
