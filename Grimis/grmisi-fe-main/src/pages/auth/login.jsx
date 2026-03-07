import LoginForm from '@/components/authentication/LoginForm'

const Login = () => {
    return (
        <main className="auth-cover-wrapper">
            <div className="auth-cover-content-inner">
                <div className="auth-cover-content-wrapper rounded-4">
                    <div className="auth-img rounded-4">
                        <img src="/images/auth/auth-cover-login-bg.avif" alt="img" className="img-fluid rounded-4" />
                    </div>
                </div>
            </div>
            <div className="auth-cover-sidebar-inner">
                <div className="auth-cover-card-wrapper mt-n5">
                    <div className="auth-cover-card p-sm-5">
                        <LoginForm registerPath={"/authentication/register/cover"} resetPath={"/authentication/reset/cover"} />
                    </div>
                </div>
            </div>
        </main>

    )
}

export default Login