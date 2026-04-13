<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Controller\Frontend\Products;

use Herqua\Schoenadviseur\Model\Cache\ProductsCache;
use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\Raw;
use Magento\Framework\Controller\Result\RawFactory;

class Index implements HttpGetActionInterface
{
    public function __construct(
        private readonly RawFactory $rawFactory,
        private readonly ProductsCache $cache
    ) {}

    public function execute(): Raw
    {
        $products = $this->cache->read() ?? [];
        $json = json_encode($products, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $raw = $this->rawFactory->create();
        $raw->setHeader('Content-Type', 'application/json', true);
        $raw->setHeader('Cache-Control', 'public, max-age=300', true);
        $raw->setContents($json === false ? '[]' : $json);
        return $raw;
    }
}
