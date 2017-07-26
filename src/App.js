import React, { Component } from 'react'
import {
  Navbar,
  Panel,
  Button,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  Row,
  Col,
  Grid
} from 'react-bootstrap'

import 'bootstrap-css-only'

const GITHUB_REPO_URL = 'https://github.com/dreyks/karabiner-hyper-run'
const KARABINER_IMPORT_URL = 'karabiner://karabiner/assets/complex_modifications/import?url='
const EMPTY_MAPPING = { hotkey: '', app: '' }

class App extends Component {
  state = {
    keyMappings: [{ hotkey: '', app: '' }]
  }

  filename = `${(Math.random() + 1).toString(36).substring(2)}.json`

  render() {
    return (
      <div className="App">
        <Navbar inverse={true}>
          <Navbar.Header>
            <Navbar.Brand><a href="/">Karabiner-Elements hyper-run</a></Navbar.Brand>
          </Navbar.Header>
        </Navbar>
        <Grid>
          <Row>
            <Col sm={1} smPush={12}>
              <a href={GITHUB_REPO_URL}>Github</a>
            </Col>
          </Row>
          <Row>
            <Col sm={6}>
              {this.renderForm()}
            </Col>
          </Row>
          <Row>
            {this.renderPanel()}
          </Row>
          {this.renderDebug()}
        </Grid>
      </div>
    )
  }

  renderForm() {
    return (
      <Form horizontal>
        <FormGroup>
          <Col sm={2}><ControlLabel>Key</ControlLabel></Col>
          <Col sm={10}><ControlLabel>App</ControlLabel></Col>
        </FormGroup>
        {
          this.state.keyMappings.map(({ hotkey, app }, idx) => (
            this.renderFormItem(hotkey, app, idx)
          ))
        }
      </Form>
    )
  }

  renderFormItem(hotkey, app, idx) {
    return (
      <FormGroup key={idx}>
        <Col sm={2}><FormControl type="text" value={hotkey} onChange={this.onEditClick(idx, 'hotkey')}/></Col>
        <Col sm={9}><FormControl type="text" value={app} onChange={this.onEditClick(idx, 'app')}/></Col>
      </FormGroup>
    )
  }

  renderPanel() {
    return (
      <Panel header={<h3>Use hyper key to run keyMappings</h3>}>
        <ul>
          {
            this.state.keyMappings
              .filter(this.isMappingFinished)
              .map(({ hotkey, app }) => (
                <li key={hotkey}>Use hyper + {hotkey} to run {app}</li>
              ))
          }
        </ul>
        <Button onClick={this.onImportClick} bsStyle="primary">Import</Button>
      </Panel>
    )
  }

  renderDebug() {
    if (process.env.NODE_ENV === 'production') return

    return (
      <Row>
        <pre>{this.generateJSON(true)}</pre>
      </Row>
    )
  }

  onEditClick = (index, field) => (evt) => {
    let value = evt.target.value
    if ('hotkey' === field && value.length > 1) {
      value = value.slice(-1)
    }

    const newMappings = this.state.keyMappings.map((mapping, idx) => {
      if (idx !== index) {
        return mapping
      } else {
        return { ...mapping, [field]: value }
      }
    }).filter(this.isMappingStarted)

    if (newMappings.every(this.isMappingFinished)) {
      newMappings.push(EMPTY_MAPPING)
    }

    this.setState({ keyMappings: newMappings })
  }

  onImportClick = async () => {
    const started = this.state.keyMappings.filter(this.isMappingStarted)
    if (!(started.length && started.every(this.isMappingFinished))) return //TODO: show error

    const file = await this.saveFile(this.generateJSON()) //TODO: check for save errors and notify
    const jsonUrl = file.files[this.filename].raw_url

    window.location.href = `${KARABINER_IMPORT_URL}${encodeURIComponent(jsonUrl)}`

    setTimeout(() => this.deleteFile(file.id), 2000)
  }

  isMappingFinished({ hotkey, app }) {
    return hotkey && app
  }

  isMappingStarted({ hotkey, app }) {
    return hotkey || app
  }

  generateJSON(pretty = false) {
    const json = {
      'title': 'Launch apps by hyper+letters.',
      'rules': this.state.keyMappings.filter(this.isMappingFinished).map(this.mapToRule)
    }

    return JSON.stringify(json, null, pretty ? 2 : null)
  }

  mapToRule({ hotkey, app }) {
    return {
      description: `hyper + ${hotkey} for ${app}`,
      manipulators: [
        {
          type: 'basic',
          from: {
            key_code: hotkey,
            modifiers: {
              mandatory: [
                'control',
                'command',
                'option',
                'shift'
              ]
            }
          },
          to: [
            {
              shell_command: `open '/Applications/${app}.app'`
            }
          ]
        }
      ]
    }
  }

  async saveFile(content) {
    const response = await fetch(
      'https://api.github.com/gists',
      {
        method: 'POST',
        body: JSON.stringify(
          {
            'files': {
              [this.filename]: {
                'content': content
              }
            }
          }
        )
      }
    )

    return await response.json()
  }

  deleteFile(id) {
    fetch(`https://api.github.com/gists/${id}`, { method: 'DELETE' })
  }
}

export default App
