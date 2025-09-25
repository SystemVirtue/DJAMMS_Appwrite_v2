/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			colors: {
				'youtube-red': '#FF0000',
				'youtube-dark': '#0F0F0F',
				'youtube-darker': '#181818',
				'music-purple': '#7C3AED',
				'music-pink': '#EC4899'
			},
			fontFamily: {
				'youtube': ['Roboto', 'Arial', 'sans-serif']
			},
			animation: {
				'gradient': 'gradient 6s ease infinite',
				'float': 'float 3s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
			},
			keyframes: {
				gradient: {
					'0%, 100%': {
						'background-size': '200% 200%',
						'background-position': 'left center'
					},
					'50%': {
						'background-size': '200% 200%',
						'background-position': 'right center'
					}
				},
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'pulse-glow': {
					'0%, 100%': { opacity: 1 },
					'50%': { opacity: 0.8 }
				}
			}
		}
	},
	plugins: []
};