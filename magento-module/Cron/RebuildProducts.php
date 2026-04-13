<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Cron;

use Herqua\Schoenadviseur\Model\Config;
use Herqua\Schoenadviseur\Model\DirtyFlag;
use Herqua\Schoenadviseur\Model\ProductExporter;
use Psr\Log\LoggerInterface;

class RebuildProducts
{
    public function __construct(
        private readonly Config $config,
        private readonly ProductExporter $exporter,
        private readonly DirtyFlag $dirtyFlag,
        private readonly LoggerInterface $logger
    ) {}

    public function execute(): void
    {
        if (!$this->config->isEnabled()) {
            return;
        }
        if ($this->config->getDataSource() !== 'magento_api') {
            return;
        }

        try {
            $count = $this->exporter->rebuild();
            $this->dirtyFlag->clear();
            $this->logger->info(sprintf('[Herqua] products.json rebuilt: %d products', $count));
        } catch (\Throwable $e) {
            $this->logger->error('[Herqua] rebuild failed: ' . $e->getMessage());
        }
    }
}
