import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'

const PageHeader = ({ title, subtitle }) => {
  return (
    <div className="page-header py-4 bg-white shadow-sm mb-4">
      <Container fluid>
        <Row>
          <Col>
            <h4 className="mb-1">{title}</h4>
            {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default PageHeader 