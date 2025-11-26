import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { user, signInWithGoogle, loginWithEmail } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed. Please try again.");
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Trim whitespace from email and password
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();

            console.log('Attempting login with email:', trimmedEmail);
            await loginWithEmail(trimmedEmail, trimmedPassword);
            navigate('/');
        } catch (error: any) {
            console.error("Login failed", error);

            // Provide specific error messages based on Firebase error codes
            let errorMessage = "Login failed. ";
            if (error.code === 'auth/invalid-credential') {
                errorMessage += "The email or password is incorrect. Please double-check your credentials.";
            } else if (error.code === 'auth/user-not-found') {
                errorMessage += "No account found with this email address.";
            } else if (error.code === 'auth/wrong-password') {
                errorMessage += "Incorrect password.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += "Invalid email address.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage += "Too many failed attempts. Please try again later.";
            } else {
                errorMessage += `Error: ${error.code || error.message}`;
            }

            alert(errorMessage);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-full bg-[#404E3B] flex items-center justify-center">
                        <span className="text-white font-bold text-xl">W</span>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sign in to WRTP CMS
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleEmailLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm"
                                />
                            </div>
                            <div className="mt-2 text-right">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm font-medium text-[#404E3B] hover:text-[#333f2f]"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#333f2f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B]"
                            >
                                Sign in
                            </button>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/signup" className="font-medium text-[#404E3B] hover:text-[#333f2f]">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#4285F4] hover:bg-[#357ae8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4]"
                            >
                                <LogIn className="h-5 w-5 mr-2" />
                                Sign in with Google
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
