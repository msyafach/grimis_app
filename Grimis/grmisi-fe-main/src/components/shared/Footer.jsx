const Footer = () => {
    return (
        <footer className="footer" style={{ position: 'relative', width: '100%' }}>
            <p className="fs-11 text-muted fw-medium mb-0 copyright">
                <span>Copyright ©</span>
                {new Date().getFullYear()}
                <span> GRIMIS - Governance Risk Management Information System</span>
            </p>
        </footer>
    );
}

export default Footer;
