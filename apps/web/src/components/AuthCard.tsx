import { FormEventHandler } from "react";
import { Link } from "react-router-dom";
import { LogIn, UserPlus, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export function AuthCard({
  title,
  onSubmit,
  err,
  includeName,
  loading = false
}: {
  title: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  err: string;
  includeName: boolean;
  loading?: boolean;
}) {
  const isRegister = includeName;
  return (
    <div className="flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
            {isRegister ? <UserPlus size={28} /> : <LogIn size={28} />}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Welcome to the future of campus commerce
          </p>
        </div>

        <div className="card-premium p-8">
          <form className="space-y-6" onSubmit={onSubmit} method="post" aria-busy={loading}>
            <div className="space-y-4">
              {includeName && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="name">Full Name</label>
                  <input 
                    id="name"
                    className="input-premium" 
                    name="name" 
                    placeholder="John Doe" 
                    required 
                    disabled={loading}
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="email">Email Address</label>
                <input 
                  id="email"
                  className="input-premium" 
                  name="email" 
                  type="email"
                  placeholder="name@university.edu" 
                  required 
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="password">Password</label>
                <input 
                  id="password"
                  className="input-premium" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  disabled={loading}
                />
              </div>

              {includeName && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="role">I am a...</label>
                  <select 
                    id="role"
                    className="input-premium appearance-none" 
                    name="role" 
                    defaultValue="student"
                    disabled={loading}
                  >
                    <option value="student">Student</option>
                    <option value="businessOwner">Business Owner</option>
                  </select>
                </div>
              )}
            </div>

            {err && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2 animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            )}

            <button 
              className="btn-primary w-full flex items-center justify-center gap-2 group" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isRegister ? "Create Account" : "Sign In"}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 font-medium">
              {isRegister ? (
                <>Already have an account? <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold">Sign in</Link></>
              ) : (
                <>New to QuadCommerce? <Link to="/register" className="text-brand-600 hover:text-brand-700 font-bold">Get started</Link></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
