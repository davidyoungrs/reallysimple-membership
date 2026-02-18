
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import licenses from '../data/licenses.json';

export const Licenses = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mb-4">
                        &larr; {t('Back to Home')}
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('Open Source Licenses')}</h1>
                    <p className="text-gray-600">
                        {t('The following open source libraries are used in this project:')}
                    </p>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-md divide-y divide-gray-200">
                    {licenses.map((item, index) => (
                        <div key={index} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-blue-600 truncate">{item.name}</h3>
                                <div className="ml-2 flex-shrink-0 flex">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        {item.license}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                                <p>
                                    {item.repository ? (
                                        <a href={item.repository.replace('git+', '').replace('.git', '')} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            {item.repository}
                                        </a>
                                    ) : (
                                        <span>(No repository link)</span>
                                    )}
                                </p>
                                {item.publisher && (
                                    <p className="mt-1">Publisher: {item.publisher}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
