<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Observer;

use Herqua\Schoenadviseur\Model\Config;
use Herqua\Schoenadviseur\Model\DirtyFlag;
use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;

class ProductSaveInvalidate implements ObserverInterface
{
    public function __construct(
        private readonly Config $config,
        private readonly DirtyFlag $dirtyFlag
    ) {}

    public function execute(Observer $observer): void
    {
        if (!$this->config->isEnabled()) {
            return;
        }
        if ($this->config->getDataSource() !== 'magento_api') {
            return;
        }
        $this->dirtyFlag->mark();
    }
}
